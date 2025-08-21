const pool = require("../config/db.js");

exports.getAppliedJobs = async (req, res) => {
  const candidateId = req.params.id;

  try {
    const [rows] = await pool.query(
      `SELECT a.id as applicationId, j.id as jobId, j.title, j.company, j.logo, j.location, j.salary, j.tags, 
              a.applied_date, a.status, a.invitation_sent, a.resume_downloaded
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE a.candidate_id = ?`,
      [candidateId]
    );

    const jobs = rows.map((row) => ({
      id: row.applicationId,
      jobId: row.jobId,
      title: row.title,
      company: row.company,
      logo: row.logo,
      location: row.location,
      salary: row.salary,
      tags: row.tags ? row.tags.split(",") : [],
      appliedDate: row.applied_date,
      status: row.status,
      recruiterActions: {
        invitationSent: !!row.invitation_sent,
        resumeDownloaded: !!row.resume_downloaded,
      },
    }));

    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch applied jobs" });
  }
};
