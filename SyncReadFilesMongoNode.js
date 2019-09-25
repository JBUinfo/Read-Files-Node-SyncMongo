const fs = require('fs');
const path = require('path');
const es = require('event-stream');
const PATHPADRE = 'E:/XXX';
//emails
const re = new RegExp(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i);

//BD
const mongoose = require('mongoose');
mongoose.set('useCreateIndex', true);
mongoose.set('debug', false);
mongoose.connect('mongodb://localhost/XXX', {useNewUrlParser: true});
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
const Accounts = mongoose.model('accounts',new Schema ({
  file: String,
  user: String,
  pass: String
},{versionKey: false}));

//Devuelve la lista de todos los archivos .txt
let walkSync = function(dir, filelist) {
  let files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    }
    else {
      filelist.push(path.join(dir, file));
    }
  });
  return filelist;
};
walkSync=walkSync(PATHPADRE,null);



//comienza la funcion async/sync
function sleep(ms){
  return new Promise(resolve=>{
    setTimeout(resolve,ms)
  })
}

const test = class {
  constructor() {
  }
  async then(resolve, reject) {
    try {
      let status; //flag para hacerlo sync
      let lr; //sera el stream de datos
      let lineasVSMongo = 0; //saber las lineas que ha introducido
      let user;
      let pass;
      //Recorre cada file
      for (let i = 1; i < walkSync.length; i++) {
        status = true;
        console.log(walkSync[i]);
        lineasVSMongo = 0;
        //Lee, filtra y añade cada linea a la BBDD
        lr = fs.createReadStream(walkSync[i]).pipe(es.split()).pipe(es.mapSync(async function(line){
            lineasVSMongo++;
            user = '';
            pass = '';
            if (line.includes("@")) {
              if (line.includes(":")) {
                user = line.substring(line.indexOf(":") , line.indexOf(''));
                pass = line.substring(line.indexOf(":") + 1);
              } else if (line.includes(";")) {
                user = line.substring(line.indexOf(";") , line.indexOf(''));
                pass = line.substring(line.indexOf(";") + 1);
              } else if (line.includes("|")) {
                user = line.substring(line.indexOf("|") , line.indexOf(''));
                pass = line.substring(line.indexOf("|") + 1);
              } else if (line.includes("||")) {
                user = line.substring(line.indexOf("||") , line.indexOf(''));
                pass = line.substring(line.indexOf("||") + 1);
              }
              if (pass != '' & re.test(String(user).toLowerCase())) {//si es un email valido, introduce en la DB
                await Accounts.create({
                  file:walkSync[i],
                  user: user,
                  pass: pass
                },function (err, small) {
                    lineasVSMongo--;
                    console.log(lineasVSMongo);
                    if (err) return err;
                  }
                );
              }
            }
          }))
          .on('end', function () {//cuando termina de leer el archivo
            status = false;
            console.log(walkSync[i]+' CERRADO');
          });

        while(status) {
          await sleep(1000);//esta linea hace que sea sync
        };
      }
      resolve();
    }
    catch(e) {
      console.log(e);
    }
  }
};

(async() => {
  try {
    let comienza = await new test();
  }
  catch(e) {
    console.log(e);
  }
})();
