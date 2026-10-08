import { Router } from "express";
import { query } from "../lib/db";
import { existsSync, mkdirSync, writeFileSync, createReadStream, statSync } from "fs";
import { join, extname } from "path";

const router = Router();

const UPLOAD_DIR = join(process.cwd(), "uploads");
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const fmtSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

// GET /api/documents — list documents
router.get("/", async (req, res) => {
  try {
    const { client_id, sr_id, lead_id, deal_id, vertical, type, status, search, page = "1", limit = "15" } = req.query as Record<string, string>;
    const pageNum = parseInt(page, 10);
    const pageSize = Math.min(parseInt(limit, 10), 50);
    const offset = (pageNum - 1) * pageSize;

    let where = "WHERE 1=1";
    const params: any[] = [];
    if (client_id) { params.push(client_id); where += ` AND d.client_id=$${params.length}`; }
    if (sr_id) { params.push(sr_id); where += ` AND d.sr_id=$${params.length}`; }
    if (lead_id) { params.push(lead_id); where += ` AND d.lead_id=$${params.length}`; }
    if (deal_id) { params.push(deal_id); where += ` AND d.deal_id=$${params.length}`; }
    if (vertical) { params.push(vertical); where += ` AND d.vertical=$${params.length}`; }
    if (type && type !== "all") { params.push(type); where += ` AND d.type=$${params.length}`; }
    if (status && status !== "all") { params.push(status); where += ` AND d.status=$${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND d.name ILIKE $${params.length}`; }

    const countResult = await query(`SELECT COUNT(*) FROM documents d ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(pageSize, offset);
    const result = await query(
      `SELECT d.*, u.name as created_by_name, c.name as client_name, c.client_code,
       (d.s3_bucket = 'local') as is_local
       FROM documents d
       LEFT JOIN users u ON d.created_by = u.id
       LEFT JOIN clients c ON d.client_id = c.id
       ${where} ORDER BY d.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    res.json({ data: result.rows, total, page: pageNum, pageSize });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents/:id/versions — version history
router.get("/:id/versions", async (req, res) => {
  try {
    const result = await query(
      `SELECT dv.*, u.name as uploader_name FROM document_versions dv
       LEFT JOIN users u ON dv.uploaded_by = u.id
       WHERE dv.document_id = $1 ORDER BY dv.created_at DESC`,
      [req.params.id],
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents/:id/download — serve local file or return preview-not-available
router.get("/:id/download", async (req, res) => {
  try {
    const result = await query("SELECT * FROM documents WHERE id=$1", [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: "Document not found" });
    const doc = result.rows[0];
    // If it's a locally stored file, serve it
    if (doc.s3_bucket === "local" && doc.s3_key) {
      const filePath = join(UPLOAD_DIR, doc.s3_key);
      if (!existsSync(filePath)) return res.status(404).json({ error: "File not found on disk" });
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.name)}"`);
      res.setHeader("Content-Length", String(statSync(filePath).size));
      return createReadStream(filePath).pipe(res);
    }
    // Seeded/demo documents without a local file — return a friendly JSON response
    return res.status(422).json({
      error: "preview_unavailable",
      message: `"${doc.name}" is a demo document and cannot be downloaded. Upload a real file to enable downloads.`,
      name: doc.name,
      type: doc.type,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documents/upload — accepts base64-encoded file
router.post("/upload", async (req, res) => {
  try {
    const { name, type, client_id, sr_id, lead_id, deal_id, vertical, fileData, fileName, note } = req.body;
    const created_by = req.user?.id; // uploader is always the signed-in user
    if (!fileData || !fileName) return res.status(400).json({ error: "fileData and fileName are required" });

    const base64Clean = fileData.replace(/^data:[^;]+;base64,/, "");
    const fileBuffer = Buffer.from(base64Clean, "base64");
    if (fileBuffer.length > 50 * 1024 * 1024) return res.status(400).json({ error: "File too large (max 50 MB)" });

    const ext = extname(fileName) || ".bin";
    const safeId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const savedName = `${safeId}${ext}`;
    const filePath = join(UPLOAD_DIR, savedName);
    writeFileSync(filePath, fileBuffer);

    const sizeLabel = fmtSize(fileBuffer.length);

    // Resolve created_by to a UUID BEFORE inserting (column is UUID type)
    let uploaderUuid: string | null = null;
    let uploaderName = "System";
    if (created_by) {
      const uRes = await query("SELECT id, name FROM users WHERE id::text=$1 OR email=$1 LIMIT 1", [created_by]);
      if (uRes.rows.length) { uploaderUuid = uRes.rows[0].id; uploaderName = uRes.rows[0].name; }
      else { uploaderName = String(created_by); }
    }

    const countResult = await query("SELECT COUNT(*) FROM documents");
    const seq = String(parseInt(countResult.rows[0].count, 10) + 1).padStart(4, "0");
    const prefix = (vertical || "XX").toUpperCase().slice(0, 2);
    const doc_code = `DOC-${prefix}-${seq}`;

    const docRes = await query(
      `INSERT INTO documents (doc_code, name, type, client_id, sr_id, vertical, s3_bucket, s3_key, created_by, current_version, status, lead_id, deal_id)
       VALUES ($1,$2,$3,$4,$5,$6,'local',$7,$8,'v1.0','Active',$9,$10) RETURNING *`,
      [doc_code, name || fileName, type || "Other", client_id || null, sr_id || null, vertical || null, savedName, uploaderUuid, lead_id || null, deal_id || null],
    );
    const docId = docRes.rows[0].id;

    await query(
      `INSERT INTO document_versions (document_id, version, s3_key, size_bytes, uploaded_by, uploader_name, note)
       VALUES ($1,'v1.0',$2,$3,$4,$5,$6)`,
      [docId, savedName, fileBuffer.length, uploaderUuid, uploaderName, note || "Initial upload"],
    );

    await query(
      "INSERT INTO audit_logs (entity_type, entity_id, user_name, action, details) VALUES ('document',$1,$2,'Document Uploaded',$3)",
      [docId, uploaderName, `${doc_code}: ${name || fileName} (${sizeLabel}) uploaded to ${vertical || "General"}`],
    );

    res.status(201).json({ ...docRes.rows[0], file_size: sizeLabel });
  } catch (err: any) {
    console.error("[Document Upload]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documents — create document record (legacy — S3 metadata)
router.post("/", async (req, res) => {
  try {
    const { name, type, client_id, sr_id, vertical, s3_bucket, s3_key, created_by } = req.body;

    const countResult = await query("SELECT COUNT(*) FROM documents");
    const seq = String(parseInt(countResult.rows[0].count, 10) + 1).padStart(4, "0");
    const doc_code = `DOC-${vertical?.toUpperCase().slice(0, 2) || "XX"}-${seq}`;

    const result = await query(
      `INSERT INTO documents (doc_code, name, type, client_id, sr_id, vertical, s3_bucket, s3_key, created_by, current_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'v1.0') RETURNING *`,
      [doc_code, name, type, client_id, sr_id, vertical, s3_bucket, s3_key, created_by],
    );
    const docId = result.rows[0].id;

    await query(
      `INSERT INTO document_versions (document_id, version, s3_key, uploaded_by, uploader_name, note)
       VALUES ($1, 'v1.0', $2, $3, 'System', 'Initial upload')`,
      [docId, s3_key, created_by],
    );

    await query(
      "INSERT INTO audit_logs (entity_type, entity_id, user_name, action, details) VALUES ('document',$1,'System','Document Uploaded',$2)",
      [docId, `${name} — v1.0 uploaded. S3: ${s3_key}`],
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documents/:id/versions — upload new version (base64)
router.post("/:id/versions", async (req, res) => {
  try {
    const { fileData, fileName, uploaded_by, uploader_name, note } = req.body;

    const doc = await query("SELECT * FROM documents WHERE id=$1", [req.params.id]);
    if (!doc.rows.length) return res.status(404).json({ error: "Document not found" });

    const currentVer = doc.rows[0].current_version;
    const parts = currentVer.split(".");
    const major = parseInt(parts[0].replace("v", ""), 10);
    const minor = parseInt(parts[1], 10);
    const newVersion = minor === 9 ? `v${major + 1}.0` : `v${major}.${minor + 1}`;

    let savedName = "";
    let sizeBytes = 0;
    if (fileData && fileName) {
      const base64Clean = fileData.replace(/^data:[^;]+;base64,/, "");
      const fileBuffer = Buffer.from(base64Clean, "base64");
      const ext = extname(fileName) || ".bin";
      const safeId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      savedName = `${safeId}${ext}`;
      writeFileSync(join(UPLOAD_DIR, savedName), fileBuffer);
      sizeBytes = fileBuffer.length;
    } else {
      savedName = doc.rows[0].s3_key;
    }

    // Resolve uploader uuid
    let uploaderUuid: string | null = null;
    const uRes = await query("SELECT id FROM users WHERE id::text=$1 OR email=$1 LIMIT 1", [uploaded_by]);
    if (uRes.rows.length) uploaderUuid = uRes.rows[0].id;

    await query(
      "INSERT INTO document_versions (document_id, version, s3_key, size_bytes, uploaded_by, uploader_name, note) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [req.params.id, newVersion, savedName, sizeBytes || null, uploaderUuid, uploader_name || "System", note || ""],
    );
    await query("UPDATE documents SET current_version=$1, s3_key=$2, updated_at=NOW() WHERE id=$3", [newVersion, savedName, req.params.id]);
    await query(
      "INSERT INTO audit_logs (entity_type, entity_id, user_name, action, details) VALUES ('document',$1,$2,'Version Uploaded',$3)",
      [req.params.id, uploader_name || "System", `New version ${newVersion} uploaded. Note: ${note}`],
    );

    res.json({ version: newVersion, message: "New version created" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
