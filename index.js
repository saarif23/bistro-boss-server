const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;

//middlewares

app.use(express.json());
app.use(cors());



/// verify the jwt token 
const verifyToken = (req, res, next) => {
    // console.log(req.headers.authorization.split(" ")[1]);
    if (!req.headers.authorization) {
        console.log("hello ");
        return res.status(401).send({ message: "unauthorized access" })

    }
    const token = req.headers.authorization.split(" ")[1]
    // console.log("token", token);
    jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (error, decoded) => {
        if (error) {
            console.log('object');
            return res.status(401).send({ message: "unauthorized access" })
        }
        req.decoded = decoded
        next();
    })
}



// local hosst
app.get('/', (req, res) => {
    res.send('Hello World!')
})


const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.USER_PASS}@cluster0.jrzn18f.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const menuCollection = client.db("bistroBossDB").collection('menu')
        const userCollection = client.db("bistroBossDB").collection('users')
        const cartCollection = client.db("bistroBossDB").collection('carts')
        const paymentCollection = client.db("bistroBossDB").collection('payments')

        /// verify the admin 
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === "admin";
            if (!isAdmin) {
                return res.status(403).send({ message: "forbidden access" })
            }
            next();
        }

        // token related api
        try {
            app.post('/jwt', async (req, res) => {
                const user = req.body;
                const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, { expiresIn: '1h' })
                res.send({ token })
            })
        } catch (error) {

        }



        // user related api



        ///
        try {
            app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
                console.log("already veriify theis token", req.headers.authorization);
                const result = await userCollection.find().toArray();
                res.send(result)
            })
        } catch (error) {

        }
        ///
        try {
            app.get('/users/admin/:email', verifyToken, async (req, res) => {
                const email = req.params.email;
                if (email !== req.decoded.email) {
                    return res.status(403).send({ message: "forbidden access" })
                }

                const query = { email: email };
                const user = await userCollection.findOne(query);
                let admin = false;
                if (user) {
                    admin = user?.role === "admin"
                }
                res.send({ admin });
            })
        } catch (error) {
        }


        ///
        try {
            app.post('/users', async (req, res) => {
                const user = req.body;

                const query = { email: user.email }
                const existingUser = await userCollection.findOne(query);
                if (existingUser) {
                    return res.send({ message: "user already exist", insertId: null })
                }
                const result = await userCollection.insertOne(user);
                res.send(result);
            })
        } catch (error) {
            console.log(error);
        }





        //users make admin 
        try {
            app.patch("/users/admin/:id", async (req, res) => {
                const id = req.params.id;
                const filter = { _id: new ObjectId(id) };
                const updatedDoc = {
                    $set: {
                        role: "admin"
                    }
                }
                const result = await userCollection.updateOne(filter, updatedDoc)
                res.send(result);
            })
        } catch (error) {
            console.log(error);
        }

        //delete a user by admin
        try {
            app.delete("/users/:id", async (req, res) => {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await userCollection.deleteOne(query);
                res.send(result);
            })
        } catch (error) {
            console.log(error);
        }


        try {
            app.post("/carts", async (req, res) => {
                const cartItem = req.body;
                const result = await cartCollection.insertOne(cartItem);
                res.send(result);
            })
        } catch (error) {
            console.log(error);
        };

        try {
            app.get("/carts", async (req, res) => {
                const email = req.query.email;
                const query = { email: email }
                const result = await cartCollection.find(query).toArray();
                res.send(result);
            })
        } catch (error) {

        }
        try {
            app.delete('/carts/:id', async (req, res) => {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) }
                const result = await cartCollection.deleteOne(query);
                res.send(result)
            })
        } catch (error) {

        }



        //find all menu 
        try {
            app.get('/menu', async (req, res) => {
                const result = await menuCollection.find().toArray();
                res.send(result)
            })
        } catch (error) {
            console.log(error);
        }

        // find single menu
        try {
            app.get("/menu/:id", async (req, res) => {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                console.log("query is get item", query);
                const result = await menuCollection.findOne(query);
                res.send(result);
            })
        } catch (error) {
            console.log(error);
        }

        // add a new menu item 
        try {
            app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
                const menuItem = req.body;
                const result = await menuCollection.insertOne(menuItem);
                res.send(result);
            })
        } catch (error) {
            console.log(error);
        }
        // update a menu item 
        try {
            app.patch('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
                const menuItem = req.body;
                const id = req.params.id;
                const filter = { _id: new ObjectId(id) }
                const updatedDoc = {
                    $set: {
                        name: menuItem.name,
                        recipe: menuItem.recipe,
                        image: menuItem.image,
                        category: menuItem.category,
                        price: menuItem.price

                    }
                }
                const result = await menuCollection.updateOne(filter, updatedDoc);
                res.send(result);
            })
        } catch (error) {
            console.log(error);
        }
        // delete a menu item 
        try {
            app.delete("/menu/:id", async (req, res) => {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await menuCollection.deleteOne(query);
                res.send(result);
            })
        } catch (error) {
            console.log(error);
        }


        // payment related api
        try {
            app.post("/create-payment-intent", async (req, res) => {
                const { price } = req.body
                const amount = parseInt(price * 100)
                console.log("amount in the payment intent", amount);
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: "usd",
                    payment_method_types: ['card']
                });
                res.send({
                    clientSecret: paymentIntent.client_secret,
                });
            })
        } catch (error) {

        }

        //get payment history by user
        try {
            app.get("/payments/:email", verifyToken, async (req, res) => {
                const email = req.body
                const query = { email: req.params.email }
                console.log(email, req.decoded.email);
                if (req.params.email !== req.decoded.email) {
                    res.status(403).send({ message: "forbidden access" })
                }
                const result = await paymentCollection.find(query).toArray();
                console.log(result);
                res.send(result)
            })
        } catch (error) {

        }

        // payment saved and delet 
        try {
            app.post("/payments", async (req, res) => {
                const payment = req.body;
                console.log("payment info ", payment);
                const paymentResult = await paymentCollection.insertOne(payment);

                //carefully delete each items in the cart
                const query = {
                    _id: {
                        $in: payment.cartIds.map(id => new ObjectId(id))
                    }
                }
                const deleteResult = await cartCollection.deleteMany(query)
                res.send({ paymentResult, deleteResult })

            })
        } catch (error) {

        }
        try {
            app.get('/admin-stats', async (req, res) => {
                const users = await userCollection.estimatedDocumentCount();
                const menuItems = await menuCollection.estimatedDocumentCount();
                const order = await paymentCollection.estimatedDocumentCount();


                //this is not a best way 
                const payments = await paymentCollection.find().toArray();
                const revenue = payments.reduce((total, payment) => total + payment.price, 0)
                res.send({
                    users,
                    menuItems,
                    order,
                    revenue
                })
            })
        } catch (error) {

        }






        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})