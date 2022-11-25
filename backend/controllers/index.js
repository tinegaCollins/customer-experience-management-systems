const ratings = require("../models/ratings.js");
const reviews = require("../models/reviews.js");
const recommendations = require("../models/recommendations.js");
const employees = require("../models/employees.js");
const company = require("../models/company.js");
const bcrypt = require("bcrypt");
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');


exports.sendRatings = async (req, res) => {
    try{
        await ratings.updateOne(
            { companyID: req.body.companyID },
            {
            $push: {
                rating: {
                    rate: req.body.rate,
                    created: Date.now()
                }
            }
            }
        );
        const allRatings = await ratings.find({ companyID: req.body.companyID }).select("rating");
        let rates = allRatings[0].rating.map(rate => rate.rate);
        let average = rates.reduce((a, b) => a + b, 0)/rates.length;
        average = Math.round(average);
        await company.updateOne(
            { _id: req.body.companyID },
            {
                $set: {
                    ratings: average
                }
            }
        );
        await res.send(true);
    }
    catch(err){
        console.log(err);
        res.send(false);
    }
}

exports.getRatings = async (req, res) => {
    try{
        const data = await ratings.findOne({ companyID: req.params.id });
        res.send(data);
    }
    catch(err){
        console.log(err);
    }
};

exports.sendReviews = async (req, res) => {
    try{
        await reviews.updateOne(
            { companyID: req.body.companyID },
            {
            $push: {
                reviews: {
                    review: req.body.review,
                    created: Date.now()
                }
            }
            }
        );
        await res.send(true);
    }
    catch(err){
        res.send(false);
    }
}


exports.getReviews = async (req, res) => {
    try{
        const data = await reviews.findOne({ companyID: req.params.id });
        res.send(data);
    }
    catch(err){
        console.log(err);
    }
}
exports.getRandomReviews = async (req, res) => {
    try{
        const data = await reviews.findOne({ companyID: req.params.id });
        const randomReviews = data.reviews.sort(() => Math.random() - 0.5).slice(0, 3); 
        res.send(randomReviews);
    }
    catch(err){
        console.log(err);
    }
}



exports.sendRecommendations = async (req, res) => {
    try{
        await recommendations.updateOne(
            { companyID: req.body.companyID },
            {
            $push: {
                recommendations: {
                    recommendation: req.body.recommendation,
                    created: Date.now()
                }
            }
            }
        );
        await res.send(true);
    }
    catch(err){
        console.log(err);
        res.send(false);
    }
}

exports.getRecommendations = async (req, res) => {
    try{
        const data = await recommendations.findOne({ companyID: req.params.id });
        res.send(data);
    }
    catch(err){
        console.log(err);
    }
}
exports.getRandomRecommendations = async (req, res) => {
    try{
        const data = await recommendations.findOne({ companyID: req.params.id });
        const randomRecommendations = data.recommendations.sort(() => Math.random() - 0.5).slice(0, 3);
        res.send(randomRecommendations);
    }
    catch(err){
        console.log(err);
    }
}
exports.sendEmployeeData = async (req, res) => {
    try{
        await employees.updateOne(
            { _id: req.params.id },
            {
            $push: {
                ratings: {
                    rating: req.body.rating
                }
            }
            }
        );
        await employees.updateOne(
            { _id: req.params.id },
            {
                $push: {
                    reviews: {
                        review: req.body.review
                    }
                }
            }
        );
        const emp = await employees.findById(req.params.id);
        //filter the array of ojects to get the rating
        const allRatings = emp.ratings.map(rate => rate.rating);
        let average = allRatings.reduce((a, b) => a + b, 0)/allRatings.length;
        average = Math.round(average);
        await employees.updateOne(
            { _id: req.params.id },
            {
                $set: {
                    averageRating: average
                }
            }
        );
        const employees2 = await employees.find({ companyID: req.body.companyID });
        //sort array of objects by average rating
        const sortedEmployees = employees2.sort((a, b) => b.averageRating - a.averageRating);
        //get the top 3 employees
        const topEmployees = sortedEmployees.slice(0, 3);
        const topEmployeesIds = topEmployees.map(emp => emp._id);
        await company.updateOne(
            { _id: req.body.companyID },
            {
                $set: {
                    topThreeEmployees : topEmployeesIds
                }
            }
        );
        res.send(true);
    }
    catch(err){
        console.log(err);
        res.send(false);
    }
}

exports.getEmployeeData = async (req, res) => {
    try{
        const data = await employees.findById(req.params.id);
        res.send(data);
    }
    catch(err){
        console.log(err);
    }
}

exports.createNewEmployee = async (req, res) => {
    try{
        const newEmployee = new employees(req.body);
        await newEmployee.save();
        await res.send(true);
    }
    catch(err){
        console.log(err);
        res.send(false);
    }
}

exports.getAllEmployees = async (req, res) => {
    try{
        // get data with req.body.id
        const data = await employees.find({ companyID: `${req.params.companyID}` });
        res.send(data);
    }
    catch(err){
        console.log("found  none");
        console.log(err);
    }
}


exports.createCompany = async (req, res) => {
    try{
        const salt = await bcrypt.genSalt();
        const hashPassword = await bcrypt.hash(req.body.password, salt);
        const newCompany = new company({
            name: req.body.name,
            email: req.body.email,
            password: hashPassword,
            ratings: 0,
            reviews: "",
            recommendations: ""
        });
        await newCompany.save();
        const companyId = await newCompany._id;
        const newRating = {
            companyID: companyId,
            ratings: []
        }
        await ratings.create(newRating);
        const newreview = {
            companyID: companyId,
            reviews: []
        }
        await reviews.create(newreview);
        const newrecommendation = {
            companyID: companyId,
            recommendations: []
        }
        await recommendations.create(newrecommendation);
        res.send(newCompany._id);
    }
    // 
    catch(err){
        console.log(err);
        res.send(false);
    }

}

exports.login = async (req, res) => {
    const data = await company.findOne({ email: req.body.email });
    if(data == null){
        res.send(false);
    }
    else{
        if( await bcrypt.compare(req.body.password, data.password )){
            res.send(data);
        }
        else{
            res.send(true);
        }
    }
}

exports.getCompanyData = async (req, res) => {
    try{
        const data = await company.findById(req.params.id);
        res.send(data);
    }
    catch(err){
        console.log(err);
        res.send(false);
    }
}

