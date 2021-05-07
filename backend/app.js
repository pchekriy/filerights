/*
 * artwork API: used to store images in MongoDB (up to 16Mb), used to retrieve images to show them on frontend
 *
 */

let express = require('express');
const cors = require('cors'); 
let app = express();
app.use(cors()); 
let bodyParser = require('body-parser'); 

let fs = require('fs'); 
let path = require('path'); 
require('dotenv').config(); 

const crypto = require('crypto');

const QRCode = require('qrcode')


//end - connecting to the database

app.use(bodyParser.urlencoded({ extended: false })); 
app.use(bodyParser.json()); 
app.use(express.static(__dirname+'/public'));
 

let multer = require('multer'); 

let storage = multer.diskStorage({ 
	destination: (req, file, cb) => { 
		cb(null, 'uploads') 
	}, 
	filename: (req, file, cb) => { 
		cb(null, file.fieldname + '-' + Date.now()) 
	} 
}); 

let upload = multer({ storage: storage,
					  limits: { fileSize: 1024*1024*10 }	
					}); 


// Uploading the file 
app.post('/upload', upload.single('userfile'), (req, res, next) => { 

	console.log('file upload');

	const filePath = path.join(__dirname + '/uploads/' + req.file.filename);
	let obj = { 
			metadata: {
				name: req.body.name, 
				desc: req.body.desc
			}, 
	        filename: req.file.filename,       
			file_content: fs.readFileSync(filePath), 
		} 
 	try {
	 	calcHash(obj,  (hash) => {
			fs.unlink(filePath, (err) => {  
	  		  if (err) {
	    			console.error(err)
	  		  }
			});

		
		   return res.send({   hash: hash,  
		   					   file_upload_date_time: Date.now().toString(),
		  					   metadata: obj.metadata,
	                           type: "success"});

	    });	
       } catch(err) {
     	  return res.status(422).send(err.message);
       }
 
}); 


app.post('/save_nft_profile', async (req, res) => {
  let { name, description, hash, file_upload_date_time } = req.body;

  //console.log(name, description, hash);
  
  if (name === '' || name === null) return res.status(422).send({"error":"missing title"});
  if (description === '' || description === null) return res.status(422).send({"error":"missing description"});
  if (hash === '' || hash === null) return res.status(422).send({"error":"missing hash"});
  if (file_upload_date_time === '' || file_upload_date_time === null) return res.status(422).send({"error":"missing file_upload_date_time"});
  let img_url = process.env.NFT_URL+'/'+hash+'.png';
  console.log(img_url);
  
  try {
    
		  saveNFTJson({  	name: name, 
                            description: description, 
                            hash: hash,
                            file_upload_date_time: file_upload_date_time,
                            image: img_url });	


          return res.send({  name: name, 
                             description: description, 
                             hash: hash,
                             file_upload_date_time: file_upload_date_time,
                             image: img_url,
                    		 type: "success"});
       
      
  } catch (err) {
    return res.status(422).send({"error":"save NFT profile api error"});
  }
  


});

app.post('/delete_nft_profile', async (req, res) => {
  let { hash } = req.body;

  
  if (hash === '' || hash === null) return res.status(422).send({"error":"wrong data"});
 

  let nft_profile = {};
  try {
    
		deleteNFTJson(hash);

        return res.send({  hash: hash, type: "deleted"});

  } catch (err) {
    return res.status(422).send({"error":"delete NFT profile api error"});
  }
  

});


function saveNFTJson(nftJson){
	try {
		let content = JSON.stringify(nftJson);
		fs.writeFileSync(process.env.JSON_PATH+'/'+nftJson.hash+'.json', content);   
		saveQRCode(nftJson);
	} catch (err){
		console.log('saveNFTJson error, JSON: '+nftJson,err);
	} 
}

function saveQRCode(nftJson){
//encode url : https://filerights.id-chain.net/?hash=asdfaf43t34t3t3
	try {
		let path = process.env.JSON_PATH+'/'+nftJson.hash+'.png';
		let encode_url = process.env.QR_URL+'/?hash='+nftJson.hash;
		QRCode.toFile(path, encode_url, {
			  color: {
			    dark: '#00F',  // Blue dots
			    light: '#0000' // Transparent background
			  }
			}, function (err) {
			  if (err) throw err
			  console.log('qr code done')
			})
	} catch (err){
		console.log('QR code save error: '+nftJson,err);
	} 

}

function deleteNFTJson(hash){
	try {
		fs.unlinkSync(process.env.JSON_PATH+'/'+hash+'.json');   
	} catch (err){
		console.log('deleteNFTJson error, hash='+hash,err);
	}
}


async function calcHash( obj, callback){
	const hashSum = crypto.createHash('sha256');
	hashSum.update(obj.file_content);

	const hex = hashSum.digest('hex');

	callback(hex);
}

app.listen(process.env.PORT, err => { 
	if (err) 
		throw err 
	console.log(`Server started on ${process.env.PORT}`) 
}) 



