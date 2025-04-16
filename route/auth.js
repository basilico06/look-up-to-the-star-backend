const { MongoClient } = require('mongodb');
const express = require('express');
const {json} = require("express");
const route = express();
const jwt = require("jsonwebtoken");
const {verify} = require("jsonwebtoken");
route.use(json());

const jwtSecretHash = "a409b49796bac375d5b48cb7cdfd32e95b7bf2b64286023bbed36dacba9b2825";

const client = new MongoClient("mongodb://localhost:27017");

( () => {
    client.connect();
    console.log("Connected to MongoDB");
})()

async function loginUser(email, password) {
    const db = client.db("test");
    const collection = db.collection("account");
    const user = await collection.findOne({ email: email, password: password });
    return user!==null ? user._id.toString() : null;

}

route.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await loginUser(email, password);
    if (user) {
        res.status(200).json({ message: "Login successful", token : jwt.sign( user, jwtSecretHash)});
    } else {
        res.status(401).json({message: "Invalid email or password"});
    }
});

route.post("/verify", async (req, res) => {
    const token = req.body.token;
    verify(token, jwtSecretHash, (err, decoded) => {
        if (err) {
            res.status(401).json({message: "Invalid token"});
        } else {
            res.status(200).json({message: "Token is valid", userId: decoded});
        }
    });
})

module.exports = route;



