import jwt from 'jsonwebtoken'
import User from '../models/user'
import express, { NextFunction } from 'express'
import { ObjectId } from 'mongoose'

interface IDecoded {
    _id: ObjectId
}

const auth = async (req: express.Request , res: express.Response, next: NextFunction) => {
    try {
        const token = req.header('Authorization').replace('Bearer ','')
        const decoded = <IDecoded>jwt.verify(token, process.env.ACCESS_Token_Secret)
        const user = await User.findById(decoded._id)
        if(!user){
            res.status(401).send({ error: 'Please Authenticate' })
        }
        req.user = user
        req.token = token
        next()
        
    } catch(e){
        res.status(401).send({error: 'Please Authenticate'});
    }
}

export default auth;