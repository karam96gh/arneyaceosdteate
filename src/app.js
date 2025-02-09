const express =require('express');
const path=require('path');
const PORT=4000;
const app=express();
const cors = require('cors'); // Import cors package

const citiesRoutes = require('./Routes/citiesRoutes');
const filesRoutes = require('./Routes/filesRoutes');
const maintypeRoutes = require('./Routes/maintypeRoutes');
const neighborhoodsRoutes = require('./Routes/neighborhoodsRoutes');
const realestateRoutes = require('./Routes/realestateRoutes');
const subtypeRoutes = require('./Routes/subtypeRoutes');
const finalTypeRoutes = require("./Routes/finalTypeRoutes");
const buildingRoutes = require('./Routes/buildingRoutes');


app.use(express.json());
app.use(cors());
app.use('/api/cities', citiesRoutes);
app.use('/api', buildingRoutes);

app.use('/api/files', filesRoutes);
app.use('/api/maintypes', maintypeRoutes);
app.use('/api/neighborhoods', neighborhoodsRoutes);
app.use('/api/realestate', realestateRoutes);
app.use('/api/subtypes', subtypeRoutes);
app.use('/images', require('./Routes/uploadImage'));
app.use("/api/finaltypes", finalTypeRoutes);

//app.use('/ads', require('./Routes/adsRoute'));

app.use(express.static(path.join(__dirname, './controllers/src/images')));
app.use(express.static(path.join(__dirname, './images/products')));


app.listen(PORT,()=>{
    console.log("server is running port 4000");
})