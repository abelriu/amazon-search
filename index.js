import express from 'express';
import axios from 'axios';
import aws4 from 'aws4';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(express.json());

const host = process.env.HOST;
const region = process.env.REGION;

app.post('/search', async (req, res) => {
  const keyword = req.body.keyword;
  if (!keyword) return res.status(400).send({ error: 'keyword missing' });

  const body = {
    Keywords: keyword,
    SearchIndex: "All",
    PartnerTag: process.env.PARTNER_TAG,
    PartnerType: "Associates",
    Marketplace: "www.amazon.es",
    Resources: [
      "Images.Primary.Small",
      "ItemInfo.Title",
      "ItemInfo.Features",
      "CustomerReviews.Count",
      "CustomerReviews.StarRating",
      "Offers.Listings.Price"
    ]
  };

  const requestOpts = {
    host,
    method: 'POST',
    path: '/paapi5/searchitems',
    service: 'ProductAdvertisingAPI',
    region,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Host': host
    },
    body: JSON.stringify(body)
  };

  aws4.sign(requestOpts, {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY
  });

  try {
    const response = await axios.post(
      `https://${host}${requestOpts.path}`,
      body,
      { headers: requestOpts.headers }
    );

    const items = response.data.SearchResult?.Items || [];

    const productos = items
      .sort((a, b) =>
        (b.CustomerReviews?.StarRating || 0) - (a.CustomerReviews?.StarRating || 0)
      )
      .slice(0, 7)
      .map(item => ({
        title: item.ItemInfo?.Title?.DisplayValue || '',
        image: item.Images?.Primary?.Small?.URL || '',
        price: item.Offers?.Listings?.[0]?.Price?.DisplayAmount || '',
        rating: item.CustomerReviews?.StarRating || 0,
        reviews: item.CustomerReviews?.Count || 0,
        url: item.DetailPageURL
      }));

    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: err.message, detalle: err.response?.data });
  }
});

app.listen(3000, () => console.log('Servidor en puerto 3000'));
