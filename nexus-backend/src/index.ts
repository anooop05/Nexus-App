import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import jobRoutes from "./routes/jobs";
import agentRoutes from "./routes/agent";
import briefingRoutes from "./routes/briefing";
import resumeRoutes from "./routes/resume";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "online",
    service: "nexus-backend",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/briefings", briefingRoutes);
app.use("/api/resume", resumeRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});