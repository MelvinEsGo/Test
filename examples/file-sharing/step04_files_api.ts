import { data, storage } from "@serverless/cloud";
import express from "express";

type File = {
  username: string;
};

export const router = express.Router();

// List the logged-in user's files
router.get("/", async (req: any, res) => {
  const { username } = res.locals.user;
  const files = await data.getByLabel("label1", `user_${username}:file_*`);
  res.json(files.items.map((item) => item.value));
});

// Middleware to check that the user has access to the file
router.use("/:id*", async (req: any, res: any, next) => {
  const { id } = req.params;
  const { username } = res.locals.user;

  const file = await data.get<File>(`file_${id}`);
  if (!file) {
    res.status(404).send("File not found");
    return;
  }

  if (file.username !== username) {
    res.status(403).json({
      message: "You don't have access to this file",
    });
    return;
  }

  res.locals.file = file;
  return next();
});

// Return the file
router.get("/:id", async (req: any, res) => {
  res.json(res.locals.file);
});

// Download the file
router.get("/:id/download", async (req: any, res) => {
  const url = await storage.getDownloadUrl(`files/${req.params.id}`);
  res.redirect(url);
});

// Delete the file
router.delete("/:id", async (req: any, res) => {
  await data.remove(`file_${req.params.id}`);
  res.status(204).send();
});

// When a file is deleted in the database, remove it from storage
data.on("deleted:file_*", async ({ item }) => {
  const { id } = item.value;
  await storage.remove(`files/${id}`);
});