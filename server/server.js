require('./../config/config')

const express = require('express');
const bodyParser = require('body-parser');
const {ObjectID} = require('mongodb')
const _ = require('lodash');
const bcrypt = require('bcryptjs');

var mongoose = require("../db/setup");
var {Todo} = require('../models/todo');
var {User} = require('../models/user');
var {authenticate} = require('./../middlewares/authenticate');

// console.log("express = ",express)
var app = express();
var port = process.env.PORT || 5000;
app.use(bodyParser.json());
app.use(express.json());

app.listen(port, () => {
    console.log(`connected to Port: ${port}`);
})

// PUBLIC API *******************************************************************************


app.post('/user', (req, res) => {
    // console.log("Req.body = ",JSON.stringify(req.body, undefined, 2));
    var body = _.pick(req.body, ['email', 'password']);
    // console.log("BODY of /user ",body)
    var newUser = new User(body);

    newUser.save()
        .then(() => {
            // console.log("saved document...")
            return newUser.generateAuthToken()
        })
        .then((token) => {
            // console.log("saved token...",token);
            // console.log("NEWUSER = ",newUser);
            res.header('x-auth',token).send(newUser);
        }, (err) => {
            res.status(400).send(err);
        })
})

app.get('/user/:id', (req, res) => {
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!")
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

// app.get('/todo/:id', (req, res) => {
//     console.log("!!!!!!!!!!!!!!!!!!!!!!!!")
//     var id = req.params.id;
//     if(!ObjectID.isValid(id)){
//         return res.status(404).send({errorMessage: "Id is not valid"})
//     }

//     Todo.findOne({_id: id})
//         .then((docs) => {
//             if(!docs){
//                 return res.status(404).send({errorMessage: "no document found"})
//             }
//             res.send(docs);
//         }, (err) => {
//             res.status(400).send(err)
//         })
// })

app.post("/users/login", (req, res) => {
    var usr;
    // console.log('req.body = ',req.body);
    let body = _.pick(req.body, ['email', 'password']);
    //  APPROACH  -----------  1
    // User.findOne({email: body.email})
    //     .then((user) => {
    //         usr = user
    //         console.log("USER ", user);
    //         return bcrypt.compare(body.password, user.password);
    //     })
    //     .then((response) => {
    //         console.log("RESPONSE   ",response)
    //         if(response == true){
    //             res.send(usr);
    //         } else{
    //             res.status(400).send();
    //         }
    //     })

    //  APPROACH  -----------  2
    User.findByCredentials(body)
        .then((user) => {
            //  console.log("user recieved in server.js")
            return user.generateAuthToken()
                .then((token) => {
                    // console.log("NEW TOKEN recieved in server.js")
                    res.header('x-auth',token).send(user)
                })
        })
        .catch((e) => {
            // console.log("error recieved in server.js",e)
            res.status(400).send();
        })

})
// ***************************************************


// PRIVATE API  *******************************************************************

app.get("/users/me", authenticate, (req, res) => {
    // console.log("req = ", req.header);
    res.send(req.user);
    
})

app.delete('/users/me/token', authenticate, (req, res) => {

    req.user.deleteToken(req.token)
        .then( (result) => {
            res.send();
        },
        (err) => {
            res.status(401).send()
        })
})

app.post('/todo', authenticate, (req, res) => {
    // console.log("Req.body = ",JSON.stringify(req.body, undefined, 2));
    var newtodo = new Todo({
        completed: req.body.completed,
        completedAt: req.body.completedAt,
        task: req.body.task,
        _creator: req.user._id
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

app.get("/todo", authenticate, (req, res) => {
    Todo.find({_creator: req.user._id})
        .then((docs) => {
            res.send(docs);
        },(err) =>{
            res.status(400).send(err);
        })
})

app.get('/todo/:id', authenticate, (req, res) => {
    var id = req.params.id;
    if(!ObjectID.isValid(id)){
        return res.status(404).send({errorMessage: "Id is not valid"})
    }

    Todo.findOne({_id: id, _creator: req.user._id})
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

app.delete("/todo/:id", authenticate, (req, res) => {
    var id = req.params.id;

    if(!ObjectID.isValid(id)){
        return res.status(404).send({errorMessage: 'Invalid Id'});
    }
    Todo.findOneAndDelete({_id: id, _creator: req.user._id})
        .then( (doc) => {
            if(!doc){
                return res.status(404).send({errorMessage: 'document not found'});
            }
            res.send({doc});
        }, (err) => {
            res.statue(400).send(err);
        })
})

app.patch('/todo/:id', authenticate, (req, res) => {
    var id = req.params.id;

    var body = _.pick(req.body, ['task', 'completed']);

    if(!ObjectID.isValid(id)){
        return res.status(404).send();
    }

    if(_.isBoolean(body.completed) && body.completed){
        body.completedAt = new Date();
    }else{
        body.completed = false;
        body.completedAt = null;
    }

    Todo.findOneAndUpdate({_id: id, _creator: req.user._id}, {
        $set: body
    },{new: true})
    .then((todo) => {
        if(!todo){
            return res.status(404).send({errorMessage: "document not found"});
        }
        res.send({todo});
    })
    .catch((err) => {
        res.status(400).send({err});
    })
})





module.exports = {app};


