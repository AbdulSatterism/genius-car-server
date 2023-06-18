const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config()
const port = process.env.PORT || 5000;

//middle wares
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hlsud.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
    })

}

async function run() {
    try {
        const serviceCollection = client.db('geniusCar').collection('services');
        const orderCollection = client.db('geniusCar').collection('orders');

        //jwt token
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token })
        })

        app.get('/services', async (req, res) => {
            // const query = { price: { $gt: 100, $lt: 300 } }; sorting price we don't need at now
            // const query = { price: { $eq:150 } }; 
            // const query = { price: { $leq:200 } }; 
            // const query = { price: { $nin[10,20] } }; 
            // const query = { price: { $in[10,20] } }; 
            // const query = { $and: [{ price: { $gt: 50 } }, { price: { $lt: 200 } }] };
            const search = req.query.search;
            // console.log(search)
            let query = {};
            // if (search.length) {
            //     query = {
            //         $text: {
            //             $search: search
            //         }
            //     }
            // }

            const order = req.query.order === 'asc' ? 1 : -1;
            const cursor = serviceCollection.find(query).sort({ price: order });
            const services = await cursor.toArray();
            res.send(services)
        });

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const service = await serviceCollection.findOne(query);
            res.send(service)
        });

        // orders api
        app.get('/orders', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            // console.log('insert api', decoded);
            if (decoded.email !== req.query.email) {
                res.status(403).send({ message: 'unauthorized access' })
            }

            let query = {};
            if (req.query.email) {
                query = { email: req.query.email }
            }
            const cursor = orderCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders)
        });


        app.post('/orders', verifyJWT, async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result)
        });

        app.patch('/orders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const status = req.body.status;
            const query = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: status
                }
            }
            const result = await orderCollection.updateOne(query, updatedDoc);
            res.send(result)
        })

        app.delete('/orders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        })
    }
    finally {

    }
}

run().catch(err => console.log(err))


app.get('/', (req, res) => {
    res.send("genius car server is running");
});

app.listen(port, () => {
    console.log(`server running on ${port}`)
})