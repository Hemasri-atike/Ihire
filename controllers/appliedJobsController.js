
import pool from "../config/db.js"; // Adjust path to your database config

// Get user's applied jobs
export const getAppliedJobs = async (req, res) => {
  try {
    const userId = req.user?.id; // From authentication middleware
    const userRole = req.user?.role;

    if (!userId || userRole !== "job_seeker") {
      return res.status(403).json({ error: "Forbidden", details: "Only job seekers can access their applied jobs" });
    }

    // Pagination and filters
    const limit = parseInt(req.query.limit, 10) || 4;
    const page = parseInt(req.query.page, 10) || 1;
    const offset = (page - 1) * limit;
    const searchQuery = req.query.search || "";
    const statusFilter = req.query.status || "All";

    // Build main query
    let sql = `
      SELECT 
        a.id,
        a.job_id AS job_id,
        a.status,
        a.createdAt,
        j.title,
        j.company_name,
        j.location,
        j.salary,
        j.tags
      FROM applications a
      LEFT JOIN jobs j ON a.job_id = j.id
      WHERE a.candidate_id = ?
    `;
    const queryParams = [userId];

    // Add search condition
    if (searchQuery) {
      sql += ` AND (j.title LIKE ? OR j.company_name LIKE ?)`;
      queryParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }

    // Add status filter condition
    if (statusFilter && statusFilter !== "All") {
      sql += ` AND a.status = ?`;
      queryParams.push(statusFilter);
    }

    sql += ` ORDER BY a.createdAt DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    // Log query and parameters for debugging
    console.log("Executing main query:", sql);
    console.log("Main query parameters:", queryParams);

    // Execute main query
    const [applications] = await pool.execute(sql, queryParams);

    // Build count query
    let countSql = `
      SELECT COUNT(*) AS total 
      FROM applications a 
      LEFT JOIN jobs j ON a.job_id = j.id 
      WHERE a.candidate_id = ?
    `;
    const countParams = [userId];

    if (searchQuery) {
      countSql += ` AND (j.title LIKE ? OR j.company_name LIKE ?)`;
      countParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }

    if (statusFilter && statusFilter !== "All") {
      countSql += ` AND a.status = ?`;
      countParams.push(statusFilter);
    }

    // Log count query and parameters for debugging
    console.log("Executing count query:", countSql);
    console.log("Count query parameters:", countParams);

    // Execute count query
    const [totalResult] = await pool.execute(countSql, countParams);

    // Format response
    res.status(200).json({
      jobs: applications.map((row) => ({
        id: row.id,
        job_id: row.job_id,
        title: row.title || "N/A",
        company_name: row.company_name || "N/A",
        location: row.location || "N/A",
        salary: row.salary || "Not disclosed",
        tags: row.tags ? row.tags.split(",") : [], // Assuming tags is a comma-separated string
        status: row.status || "Applied",
        createdAt: row.createdAt || new Date().toISOString(),
        recruiterActions: {
          invitationSent: !!row.interviewDate,
          resumeDownloaded: false, // Update if tracking resume downloads
        },
      })),
      total: totalResult[0]?.total || 0,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    console.error("Error fetching applied jobs:", err);
    res.status(500).json({ error: "Error fetching applications", details: err.message });
  }
};
