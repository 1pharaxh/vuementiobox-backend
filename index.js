// use environment variables to store sensitive data
require("dotenv").config();
openApiKey = process.env.OPENAI_API_KEY;
elasticSearchId = process.env.ELASTIC_SEARCH_ID;
elasticSearchUsername = process.env.ELASTIC_SEARCH_USERNAME;
elasticSearchPassword = process.env.ELASTIC_SEARCH_PASSWORD;
async function generate() {
  const { Configuration, OpenAIApi } = require("openai");
  const configuration = new Configuration({
    apiKey: openApiKey,
  });
  const openai = new OpenAIApi(configuration);
  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: "generate 25 random names and emails",
    temperature: 0.7,
    max_tokens: 512,
    best_of: 1,
    top_p: 1,
  });
  let text = response.data.choices[0].text;
  const lines = text.split("\n");

  // Initialize an empty array to store the objects
  const objects = [];

  // Iterate through each line
  for (const line of lines) {
    // Split the line into an array containing the name and email
    const [name, email] = line.split(" - ");

    // If the line contains a name and email, add an object to the array
    if (name && email) {
      let name1 = name.split(".")[1];
      objects.push({ name1, email });
    }
  }
  return objects;
}

async function store(data) {
  const { Client } = require("@elastic/elasticsearch");

  // Create a client for connecting to the Elasticsearch cluster
  const client = new Client({
    cloud: {
      id: elasticSearchId,
    },
    auth: {
      username: elasticSearchUsername,
      password: elasticSearchPassword,
    },
  });

  // Use the info() method to check that the client can connect to the cluster
  client
    .info()
    .then((response) => console.log(response))
    .catch((error) => console.error(error));
  client.indices.delete(
    {
      index: "_all",
    },
    async function (err, res) {
      if (res) {
        console.log("Indices have been deleted!");
      }
      if (err) {
        await client.indices.create(
          {
            index: "my_index",
          },
          (error, response) => {
            console.log("Created index");
            console.log(response);
          }
        );
      }
    }
  );
  await client.indices.create(
    {
      index: "my_index",
    },
    (error, response) => {
      console.log("Created index");
      console.log(response);
    }
  );
  // Use the index() method to store the data in Elasticsearch

  client.index(
    {
      index: "my_index",
      body: {
        title: "customers",
        body: JSON.stringify(data),
      },
    },
    (error, response) => {
      console.log(response);
    }
  );
}

async function fetchdata() {
  const { Client } = require("@elastic/elasticsearch");

  // Create a client for connecting to the Elasticsearch cluster
  const client = new Client({
    cloud: {
      id: "test:dXMtY2VudHJhbDEuZ2NwLmNsb3VkLmVzLmlvOjQ0MyQ4MzFiNmFjOGZmZTY0ODcxODkxODJlOGZiZGJjOTRlYiQ1OTliYjJiOWVhMDU0NjQ5YjIzNTRiMjI4NTFmYWU1Mw==",
    },
    auth: {
      username: "elastic",
      password: "o79oPs573AYlQM1UClvqJiJS",
    },
  });
  const result = await client.search({
    index: "my_index",
    query: {
      match: { title: "customers" },
    },
  });
  return result.hits.hits;
}

const express = require("express");
var cors = require("cors");

const app = express();

// Body parser middleware
app.use(express.json());
app.use(cors());

app.get("/generate", async (req, res) => {
  const data = await generate();
  await store(data);
  res.send("Data generated and stored");
});

app.get("/fetch", async (req, res) => {
  const data = await fetchdata();
  res.send(data);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
