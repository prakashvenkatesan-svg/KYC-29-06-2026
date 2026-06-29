const { downloadApplicationPdf } = require("./controllers/contactController");

const req = { params: { application_id: 50 } };
const res = {
  status: function(code) {
    console.log("STATUS:", code);
    return this;
  },
  json: function(data) {
    console.log("SUCCESS:", data.success);
    console.log("DATA KEYS:", Object.keys(data));
    if (data.data) {
      console.log("DATA SUBKEYS:", Object.keys(data.data));
      console.log("CONTENT LENGTH:", data.data.content?.length);
      console.log("CONTENT START:", data.data.content?.substring(0, 50));
    }
  }
};

downloadApplicationPdf(req, res).catch(console.error);
