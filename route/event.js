const https = require('https');
const { MongoClient } = require('mongodb');
const express = require('express');
const {json} = require("express");
const route = express();
route.use(json());

const  {createClient}  = require( 'redis');
const clientRedis = createClient();
const client = new MongoClient("mongodb://localhost:27017");

( () => {
    client.connect();
    console.log("Connected to MongoDB");
    clientRedis.connect();
    console.log("Connected to Redis");
})()


async function getDataFromRedis(date1, date2, date3) {
    const data = await clientRedis.MGET([date1, date2, date3] );
    if (data) {
        console.log("Data from Redis");
        return data;
    } else {
        console.log("Data not found in Redis");
        return null;
    }

}



async function getDataFromAPIcad( year , month, day){

    const baseDate = new Date(year, month - 1, day);

    const actualDate = new Date(baseDate);
    const middleDate = new Date(baseDate);
    middleDate.setDate(middleDate.getDate() + 1);
    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + 2);
    const lastDate = new Date(baseDate);
    lastDate.setDate(lastDate.getDate() + 3);

    let arrayDate= [
        `${actualDate.getFullYear()}-${String(actualDate.getMonth()+1).padStart(2, '0')}-${String(actualDate.getDate()).padStart(2, '0')}`,
        `${middleDate.getFullYear()}-${String(middleDate.getMonth()+1).padStart(2, '0')}-${String(middleDate.getDate()).padStart(2, '0')}`,
        `${nextDate.getFullYear()}-${String(nextDate.getMonth()+1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`,
        `${lastDate.getFullYear()}-${String(lastDate.getMonth()+1).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')}`
    ];

    let alredyRegiteredData=await getDataFromRedis(
        arrayDate[0],
        arrayDate[1],
        arrayDate[2]
    );

    let numberRegiteredData = alredyRegiteredData.filter(x => x === null).length;
    if (numberRegiteredData === 0) {
        console.log("Data already registered");
        return await client.db("test").collection("flyby").find({
            date: {
                $gte: actualDate.getTime(),
                $lte: lastDate.getTime()
            }

        }).toArray();
    }

    const urlCAB = `https://ssd-api.jpl.nasa.gov/cad.api?dist-max=0.5&diameter=true&fullname=true&date-min=${arrayDate[3-numberRegiteredData]}&sort=dist&date-max=${lastDate.getFullYear()}-${String(lastDate.getMonth()+1).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')}`;
    console.log(urlCAB);
    const responseCAB=await fetch(urlCAB)
    const dataCAB = await responseCAB.json()
    let mappedData=  [];

    for(let i = 0; i < dataCAB.data.length; i++) {
        mappedData.push({
                ID: dataCAB.data[i][0],
                date: new Date(dataCAB.data[i][3]+":00").getTime(),
                info: {
                    name: dataCAB.data[i][13],
                    diameter: dataCAB.data[i][11],
                    orbit_id: dataCAB.data[i][1],
                    jd: dataCAB.data[i][2],
                    cd: dataCAB.data[i][3],
                    dist: dataCAB.data[i][4],
                    dist_min: dataCAB.data[i][5],
                    dist_max: dataCAB.data[i][6],
                    v_rel: dataCAB.data[i][7],
                    v_inf: dataCAB.data[i][8],
                    t_sigma_f: dataCAB.data[i][9],
                    h: dataCAB.data[i][10]
                }
            }
        );
    }

    await client.db("test").collection("flyby").insertMany(mappedData);
    for (let i = 3-numberRegiteredData; i < 3; i++) {
        await clientRedis.set(arrayDate[i], "Ok");
    }

    const resultQueryDatabase =await client.db("test").collection("flyby").find({date : {$gte: actualDate.getTime(), $lte: lastDate.getTime()}}).toArray();
    let result = [...mappedData, ...resultQueryDatabase];

    return result;

}

// test geDataFromAPIcad
// simple output
(async () => {console.log (await getDataFromAPIcad( 2025, 4, 8));})();

async function getDataFromAPIsbowbs(lat, lon, alt, year, month, day) {

    const baseDate = new Date(year, month - 1, day);

    const actualDate = new Date(baseDate);
    const middleDate = new Date(baseDate);
    middleDate.setDate(middleDate.getDate() + 1);
    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + 2);
    const lastDate = new Date(baseDate);
    lastDate.setDate(lastDate.getDate() + 3);

    let arrayDate= [
        `${actualDate.getFullYear()}-${String(actualDate.getMonth()+1).padStart(2, '0')}-${String(actualDate.getDate()).padStart(2, '0')}`,
        `${middleDate.getFullYear()}-${String(middleDate.getMonth()+1).padStart(2, '0')}-${String(middleDate.getDate()).padStart(2, '0')}`,
        `${nextDate.getFullYear()}-${String(nextDate.getMonth()+1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`,
        `${lastDate.getFullYear()}-${String(lastDate.getMonth()+1).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')}`
    ];

    let registeredEventBasedOnLocation =await client.db("test").collection("events-register").find(
        {
        eventDate: {$gte: actualDate.getTime(), $lte: lastDate.getTime()},
        location: {
            $near: {
                $geometry: { type: "Point", coordinates: [lon, lat] },
                $maxDistance: 50000  // 5 km
                }
            }
        },
    ).project(
        {
            _id: 0,
            eventDate: 1,
        }
    ).toArray();




    if (registeredEventBasedOnLocation.length === 3) {
        console.log("Data already registered");
        return await client.db("test").collection( "events").find({
            location: {
                type: "Point",
                coordinates: [lon, lat]
            },
            date: {
                $gte: actualDate.getTime(),
                $lte: lastDate.getTime()
            }

        }).toArray();
    }

    const url = "https://ssd-api.jpl.nasa.gov/sbwobs.api?" +
        `lat=${lat}&` +
        `lon=${lon}` +
        `alt=${alt}&` +
        "obs-time=2025-04-02&" +
        "vmag-max=22&" +
        "helio-min=1.5&" +
        "glat-min=10";

    console.log(url);


}

//async () => {console.log (await getDataFromAPIsbowbs(40.127686, 18.296406, 100, 2025, 4, 11));})();

route.get('/:lat/:lon/:alt', async (req, res) => {
    const lat = req.params.lat;
    const lon = req.params.lon;
    const alt = req.params.alt;
    const dateNow = new Date();

    const data = await getDataFromAPIcad(dateNow.getFullYear(), dateNow.getMonth() + 1, dateNow.getDate());

    if (data.length >0) {
        res.json(data);
        return ;
    }

    res.status(501 ).json({message: "No data found"});
    return ;

});


module.exports = route;