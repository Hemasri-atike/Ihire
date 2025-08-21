// Candidate Dashboard Controller
export const getCandidateDashboard = async (req, res, db) => {
  try {
    const { userId } = req.params;

    // Candidate Profile
    const [profileRows] = await db.query(
      "SELECT id, name, email, profile_completion FROM candidates WHERE id = ?",
      [userId]
    );

    // Jobs Applied
    const [appliedJobs] = await db.query(
      `SELECT j.id, j.title, j.company, j.location, j.salary, aj.status, aj.created_at as time
       FROM applied_jobs aj
       JOIN jobs j ON aj.job_id = j.id
       WHERE aj.candidate_id = ? ORDER BY aj.created_at DESC LIMIT 5`,
      [userId]
    );

    // Notifications
    const [notifications] = await db.query(
      "SELECT id, type, message, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 5",
      [userId]
    );

    res.json({
      profile: profileRows[0] || {},
      profileCompletion: profileRows[0]?.profile_completion || 0,
      jobs: appliedJobs,
      notifications,
    });
  } catch (err) {
    console.error("Candidate Dashboard Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Employer Dashboard Controller
export const getEmployerDashboard = async (req, res, db) => {
  try {
    const { employerId } = req.params;

    // Jobs posted by employer
    const [jobs] = await db.query(
      "SELECT id, title, company, location, salary, applications FROM jobs WHERE employer_id = ?",
      [employerId]
    );

    // Notifications
    const [notifications] = await db.query(
      "SELECT id, type, message, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 5",
      [employerId]
    );

    // Stats
    const [stats] = await db.query(
      "SELECT COUNT(*) as totalApplications FROM applications WHERE employer_id = ?",
      [employerId]
    );

    res.json({
      jobs,
      notifications,
      stats: stats[0],
    });
  } catch (err) {
    console.error("Employer Dashboard Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
