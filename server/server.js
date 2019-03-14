const express = require('express');
const bodyParser = require('body-parser');
const {ObjectID} = require('mongodb')

var mongoose = require("../db/setup");
var {Todo} = require('../models/todo');
var {User} = require('../models/user');

// console.log("express = ",express)
var app = express();
var port = process.env.PORT || 5000;
// app.use(bodyParser.json());
app.use(express.json());


app.post('/todo', (req, res) => {
    // console.log("Req.body = ",JSON.stringify(req.body, undefined, 2));
    var newtodo = new Todo({
        completed: req.body.completed,
        completedAt: req.body.completedAt,
        task: req.body.task
    })

    newtodo.save()
        .then((doc) => {
            // console.log("**Document: ",doc);
            res.send(doc);
        }, (err) => {
            // console.log("**Error: ",err);
            res.status(400).send(err);
        })
})

app.post('/user', (req, res) => {
    // console.log("Req.body = ",JSON.stringify(req.body, undefined, 2));
    var newUser = new User({
        email: 'email.com'
    })

    newUser.save()
        .then((doc) => {
            // console.log("**Document: ",doc);
            res.send(doc);
        }, (err) => {
            // console.log("**Error: ",err);
            res.status(400).send(err);
        })
})

app.get('/user/:id', (req, res) => {
    var id = req.params.id;
    if(!ObjectID.isValid(id)){
        return res.status(404).send({errorMessage: "Id is not valid"})
    }

    User.findById(id)
        .then((docs) => {
            if(!docs){
                return res.status(404).send({errorMessage: "no document found"})
            }
            res.send(docs);
        }, (err) => {
            res.status(400).send(err)
        })
})

app.get('/todo/:id', (req, res) => {
    var id = req.params.id;
    if(!ObjectID.isValid(id)){
        return res.status(404).send({errorMessage: "Id is not valid"})
    }

    Todo.findById(id)
        .then((docs) => {
            if(!docs){
                return res.status(404).send({errorMessage: "no document found"})
            }
            res.send({docs,randomText:'randomText'});
        }, (err) => {
            res.status(400).send(err)
        })
        .catch((err) => {
            return res.status(400).send({err});
        })
})

app.get("/todo", (req, res) => {
    Todo.find()
        .then((docs) => {
            res.send(docs);
        },(err) =>{
            res.status(400).send(err);
        })
})

app.listen(port, () => {
    console.log(`connected to Port: ${port}`);
})

module.exports = {app};


