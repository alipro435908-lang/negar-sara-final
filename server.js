const path = require("path");
const express = require("express");
const session = require("express-session");
const { readData, writeData, nextId, slugify } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "negar-sarabsazi-secret-please-change",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8 }
  })
);

// ---------- helpers ----------
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.redirect("/admin/login");
}

const SERVICES = [
  {
    key: "design",
    title: "هویت بصری و طراحی گرافیک",
    desc: "لوگو، هویت برند، طراحی بسته‌بندی و محتوای بصری شبکه‌های اجتماعی."
  },
  {
    key: "photo",
    title: "عکاسی مفهومی و تبلیغاتی",
    desc: "عکاسی پرتره، محصول و پروژه‌های میدانی با نگاهی داستانی."
  },
  {
    key: "art",
    title: "کارگردانی هنری پروژه",
    desc: "از ایده تا اجرا؛ همراهی کامل در پروژه‌های خلاقانه‌ی برند شما."
  }
];

// ---------- public routes ----------
app.get("/", (req, res) => {
  const posts = readData("posts").slice(-3).reverse();
  res.render("index", { services: SERVICES, posts, query: req.query });
});

app.get("/blog", (req, res) => {
  const posts = readData("posts").slice().reverse();
  res.render("blog", { posts });
});

app.get("/post/:slug", (req, res) => {
  const posts = readData("posts");
  const post = posts.find((p) => p.slug === req.params.slug);
  if (!post) return res.status(404).render("404");
  const shareUrl = `${req.protocol}://${req.get("host")}/post/${post.slug}`;
  res.render("post", { post, shareUrl });
});

app.post("/order", (req, res) => {
  const { name, phone, service, budget, message } = req.body;
  if (!name || !phone || !service) {
    return res.redirect("/?order=error#order");
  }
  const orders = readData("orders");
  const order = {
    id: nextId(orders),
    name,
    phone,
    service,
    budget: budget || "",
    message: message || "",
    status: "جدید",
    createdAt: new Date().toISOString()
  };
  orders.push(order);
  writeData("orders", orders);
  res.redirect("/?order=success#order");
});

// ---------- admin auth ----------
app.get("/admin/login", (req, res) => {
  if (req.session && req.session.isAdmin) return res.redirect("/admin");
  res.render("admin-login", { error: null });
});

app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  const admin = readData("admin");
  if (username === admin.username && password === admin.password) {
    req.session.isAdmin = true;
    return res.redirect("/admin");
  }
  res.render("admin-login", { error: "نام کاربری یا رمز عبور اشتباه است." });
});

app.get("/admin/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/admin/login"));
});

// ---------- admin dashboard ----------
app.get("/admin", requireAdmin, (req, res) => {
  const orders = readData("orders").slice().reverse();
  const posts = readData("posts").slice().reverse();
  res.render("admin-dashboard", {
    orders,
    posts,
    tab: req.query.tab || "orders",
    editingPost: null
  });
});

app.post("/admin/orders/:id/status", requireAdmin, (req, res) => {
  const orders = readData("orders");
  const order = orders.find((o) => o.id === req.params.id);
  if (order) order.status = req.body.status;
  writeData("orders", orders);
  res.redirect("/admin?tab=orders");
});

app.post("/admin/orders/:id/delete", requireAdmin, (req, res) => {
  let orders = readData("orders");
  orders = orders.filter((o) => o.id !== req.params.id);
  writeData("orders", orders);
  res.redirect("/admin?tab=orders");
});

app.get("/admin/posts/new", requireAdmin, (req, res) => {
  const orders = readData("orders").slice().reverse();
  const posts = readData("posts").slice().reverse();
  res.render("admin-dashboard", { orders, posts, tab: "posts", editingPost: {} });
});

app.get("/admin/posts/:id/edit", requireAdmin, (req, res) => {
  const orders = readData("orders").slice().reverse();
  const posts = readData("posts").slice().reverse();
  const editingPost = posts.find((p) => p.id === req.params.id);
  res.render("admin-dashboard", { orders, posts, tab: "posts", editingPost: editingPost || {} });
});

app.post("/admin/posts", requireAdmin, (req, res) => {
  const { title, excerpt, content, cover } = req.body;
  const posts = readData("posts");
  const newPost = {
    id: nextId(posts),
    slug: slugify(title || "پست-جدید"),
    title: title || "بدون عنوان",
    excerpt: excerpt || "",
    content: content || "",
    cover: cover || "#c69a6d",
    date: new Date().toISOString().slice(0, 10),
    author: "نگار"
  };
  posts.push(newPost);
  writeData("posts", posts);
  res.redirect("/admin?tab=posts");
});

app.post("/admin/posts/:id/edit", requireAdmin, (req, res) => {
  const posts = readData("posts");
  const post = posts.find((p) => p.id === req.params.id);
  if (post) {
    post.title = req.body.title || post.title;
    post.excerpt = req.body.excerpt || post.excerpt;
    post.content = req.body.content || post.content;
    post.cover = req.body.cover || post.cover;
  }
  writeData("posts", posts);
  res.redirect("/admin?tab=posts");
});

app.post("/admin/posts/:id/delete", requireAdmin, (req, res) => {
  let posts = readData("posts");
  posts = posts.filter((p) => p.id !== req.params.id);
  writeData("posts", posts);
  res.redirect("/admin?tab=posts");
});

app.use((req, res) => {
  res.status(404).render("404");
});

app.listen(PORT, () => {
  console.log(`نگار سرا روی پورت ${PORT} در حال اجراست: http://localhost:${PORT}`);
});
