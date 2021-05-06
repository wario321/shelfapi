const functions = require('firebase-functions');

const express = require("express");
const axios = require('axios');
const app = express();
var firebase = require("firebase");
var admin = require('firebase-admin')
admin.initializeApp()
const cors = require('cors');
//var auth = require("firebase/auth");
//const formdata = require('express-form-data')
const bodyParser = require('body-parser');
const { ExportBundleInfo } = require('firebase-functions/lib/providers/analytics');
const { ResultStorage } = require('firebase-functions/lib/providers/testLab');

//const storage = multer.memoryStorage()


//const upload = multer({storage : storage})
app.use(cors());
app.options('*',(req,res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE'); // If needed
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true); 
  res.end()
})
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json())
app.set('view engine','ejs');



  
firebase.initializeApp(firebaseConfig);

const db = firebase.database().ref().child('Shelf');
const enable = firebase.database().ref().child('Enable');
const catalogs = firebase.database().ref().child('Catalogs');
var user = ['xsTiCSYvwde8AYT0aq2DMNtT70l1','3hcOjpCWIWTFep9YoJe37LEVWIh1','YakeLHWDkIQ9uOg2M3sBQUTiyOf2']

app.get("/api",(req,res)=> {
  const csvFilePath='../csv/Data.csv'
  const csv=require('csvtojson')
  csv()
  .fromFile(csvFilePath)
  .then((jsonObj)=>{
     res.send(jsonObj)
  })
})

//REST API
app.get("/catalogs/:shelf",(req,res) => {
  const shelf = db.child(req.params.shelf);
  const item = shelf.child('item');
  item.once('value',(data) => {
    var value = Object.values(data.val());
    res.contentType('application/json')
    res.send(JSON.stringify(value));
  });
}
)

app.get("/catalogs/:shelf/:id",(req,res) => {
  const shelf = db.child(req.params.shelf);
  const item = shelf.child('item');
  item.once('value',(data) => {
    var value = Object.values(data.val());
    value.map(mem => {
      if(mem.id == req.params.id){
        res.send(mem)
      }
    })
  })
})

app.get("/catalogs",(req,res) => {
  db.once('value',(data) => {
   // console.log(data.val())
    res.send(JSON.stringify(Object.keys(data.val())))
  })
})

app.post("/edit/:shelf/:id", async (req,res) => {
  console.log(req.body);
  const date = new Date().toISOString().slice(0,10)
  const format_data = {
    "title": req.body.title,
    "price": req.body.price,
    "promotion": (req.body.promotion != '') ? req.body.promotion : 'false',
    "weight": req.body.weight,
    "last_update": date,
    "type": req.body.type
  }
  const shelf = db.child(req.params.shelf);
  const item = shelf.child('item');
  const query = await item.once('value',(data) => {
    var value = Object.entries(data.val());
    value.map(mem => {
      if(mem[1].id == req.params.id){
         item.child(mem[0]).update(format_data);
      }
    })
  })
  catalogs.once('value',mem4 => {
    mem4.forEach(mem5 => {
      var data = mem5.val()
      if(data.id == req.params.id){
        catalogs.child(mem5.key).update({
          "title": format_data.title
        })
      }
    })
  })
  res.status(200).json({
    status: "ok"
  })
})

app.get("/enable",(req,res) => {
  enable.once('value',(data) => {
    //console.log(Object.entries(data.val()))
    res.send(Object.values(data.val()));
  })
})

app.get("/delete/:shelf/:id",(req,res) => {
  const shelf = db.child(req.params.shelf);
  const item = shelf.child('item');
  item.once('value',(data) => {
    var value = Object.entries(data.val());
    value.map(mem => {
      if(mem[1].id == req.params.id){
        item.child(mem[0]).remove();
      }
    })
  })
  catalogs.once('value',mem4 => {
    mem4.forEach(mem5 => {
      var data = mem5.val()
      if(data.id == req.params.id){
        catalogs.child(mem5.key).update({
          "shelf": ''
        })
      }
    })
}) 
  res.send("delete complete");
})

app.get("/catalogsIMG",(req,res) => {
  const img = []
  db.once('value',data => {
    const data2 = Object.values(data.val()).map(mem => mem.img)
    res.send(data2)
  })
})

app.post("/add/:shelf",(req,res) => {
  const shelf = db.child(req.params.shelf);
  const item = shelf.child('item');
  Object.values(req.body).map(mem => {
    enable.once('value',mem2 => {
      var value = Object.entries(mem2.val());
      value.map(mem3 => {
        if(mem3[1].id == mem.id){
          enable.child(mem3[0]).remove();
        }
      })
    })
    item.push().set(mem);
  })
  catalogs.once('value',mem4 => {
      mem4.forEach(mem5 => {
        var data = mem5.val()
        req.body.map(mem6 => {
          if(mem6.title == data.title){
            catalogs.child(mem5.key).update({
              "shelf": req.params.shelf
            })
          }
        })
      })
  }) 
  console.log(req.body)
  res.send('ok it send to me')
})

app.post("/upload/:shelf",(req,res) => {
  const shelf = db.child(req.params.shelf)
  const shelf_edit = shelf.child('img')
  //console.log(req.body.shelf_edit.name)
  if(req.body.image != null){
    const format_data = {
      "img": req.body.image
    }
    shelf.update(format_data)
    res.json({
      "message": "update image successful"
    })
  }
  else {
    console.log("in this case")
    res.json({
      "message": "image empty"
    })
  }
})

app.post("/delete/:shelf", (req,res) => {
  if(user.includes(req.body.uid)){
    const shelf = db.child(req.params.shelf).remove().then((success) => {
        catalogs.once('value',mem => {
          mem.forEach(data => {
            var foruse = data.val()
            if(foruse.shelf == req.params.shelf){
              catalogs.child(data.key).update({
                "shelf": ''
              })
            }
          })
        })
        res.status(200).json({"message": "remove success"}) 
    })
    .catch(err => {
      res.status(204).sendjson({"message": "shelf not found"})
    })
  }
  else{
    res.status(203).json({"message ": "no permission"})
  }  
  })


app.post("/add_shelf",(req,res) => {
  //console.log(req.body)
  const date = new Date().toISOString().slice(0,10)
  if(user.includes(req.body.uid)){
    const shelf_name = req.body.shelf_name
    const example = {
            "barcode_code": 123456789,
            "code": "ex0000",
            "id": "0000",
            "last_update": date,
            "price": "0",
            "promotion": "false",
            "stock": 0,
            "title": "example",
            "type": "example",
            "weight": "example g"
    }
    const format_data = {
        [shelf_name]:{
          "img" : req.body.image,
          "item" : [example],
          "name": shelf_name
        }
      }
    db.update(format_data)
    //console.log(req.body)
    res.status(200).send("add successful")
  }
  else{
    res.status(203).json({"message ": "no permission"})
  } 
  
})

app.get("/shelf_info",(req,res) => {
  //var data_send = []
  db.once('value').then((data) => {
    var data_send = []
    data.forEach(mem => {
      var newdata = mem.val()
      data_send.push({"name": newdata.name, "img": newdata.img})
    })
    res.send(data_send)
  })
  //res.send(data_send)
})

app.post("/move_item/:shelf",(req,res) => {
  console.log(req.body)
  const shelf = db.child(req.params.shelf).child('item')
  const target_shelf = db.child(req.body.target).child('item')
  shelf.once('value', (data) => {
    data.forEach((mem) => {
      var mem_foruse = mem.val()
      //console.log(mem_foruse.title)
      req.body.data.map(data => {
        if(data.title == mem_foruse.title){
            target_shelf.push().set(mem_foruse)
            mem.ref.remove()
        }
      })
    })
  })
  catalogs.once('value',(mem) => {
    mem.forEach(data => {
      var touse = data.val()
      req.body.data.map(data2 => {
        if(data2.id == touse.id){
          catalogs.child(data.key).update({
            "shelf": req.body.target,
            "title": data2.title
          })
        }
      })
      //console.log(data.key)
    })
  })

  res.send("ok ok")
})

app.get("/test/:shelf",(req,res) =>{
  const shelf = db.child(req.params.shelf).child('item')
  shelf.once('value',(data) => {
    data.forEach((mem) => {
      catalogs.push().set(mem.val())
    })
  })
  res.send("test")
})

app.get("/stock",(req,res) => {
  catalogs.once('value',(data) => {
    res.send(Object.values(data.val()))
  })
})


app.get("testfordeploy",(req,res) => {
  res.send("ok it work")
})

app.post("/adddata",(req,res) => {
  console.log(req.body)
  catalogs.push().update(req.body)
  res.send('test')
})

app.post('/addenable',(req,res) => {
  console.log(req.body)
  enable.push().update(req.body)
  res.send('test')
})
//exports.app = functions.https.onRequest(app);

const Port = process.env.PORT || 5000;

app.listen(Port)
  
