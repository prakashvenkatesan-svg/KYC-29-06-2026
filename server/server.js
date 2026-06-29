const app = require("./app");
require("dotenv").config();

const contactRoutes = require("./routes/contactRoutes"); // import route file

const PORT = process.env.PORT || 5000;

app.use("/api/contact", contactRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
