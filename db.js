const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function readData(name) {
  try {
    const raw = fs.readFileSync(filePath(name), "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    return name === "admin" ? {} : [];
  }
}

function writeData(name, data) {
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), "utf-8");
}

function nextId(list) {
  const max = list.reduce((m, item) => Math.max(m, parseInt(item.id, 10) || 0), 0);
  return String(max + 1);
}

function slugify(title) {
  const base = title
    .trim()
    .replace(/[^\u0600-\u06FF0-9a-zA-Z\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
  const suffix = Date.now().toString(36).slice(-5);
  return `${base || "post"}-${suffix}`;
}

module.exports = { readData, writeData, nextId, slugify };
