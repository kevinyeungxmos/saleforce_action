require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const cors = require('cors');
var bodyParser = require('body-parser')
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

let access_token = process.env.SF_ACCESS_TOKEN;
let access_token_sandbox = "00DVA000002XEuH!AQEAQFdt2llSdE.SfWiJWWZ6oG5StOIj0Iw4GBnAUfKnKv5ggc1n6AKK74bGxDovktngOY7l6U69oJQfYsQt9FlB8bFE5FRs";

// Helper: Get Salesforce Access Token
async function getSalesforceToken() {
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', process.env.SF_CLIENT_ID);
  params.append('client_secret', process.env.SF_CLIENT_SECRET);

  try {
    const response = await axios.post(process.env.SF_TOKEN_URL, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Failed to get Salesforce token:', error.response?.data || error.message);
    throw new Error('Salesforce authentication failed');
  }
}

requiredLeadData_rdf = ["email","phone","firstname","lastname","business_name","zip_code","products_of_interest","state","city","address1"];
requiredLeadData_bad = ["email","phone","firstname","lastname","business_name","zip_code","products_of_carrying","current_brands_carried","state","city","address1"];

// POST /sf_api/lead - Create Lead in Salesforce
app.post('/sf_api/lead', async (req, res) => {

  let requestedLeadBody = {};

  // Validate required fields
  if(req.body == undefined || req.body == null){
    return res.status(400).json({
      success: false,
      error: "Missing required request body"
    });
  }

  //configure lead body
  for (const field of requiredLeadData_rdf) {
    if (!req.body.hasOwnProperty(field)) {
      return res.status(400).json({
        success: false,
        error: `Missing required field: ${field}`
      });
    }
    if(field == "email"){
      requestedLeadBody["Email"] = req.body[field];
    }
    else if(field == "phone"){
      requestedLeadBody["Phone"] = req.body[field];
    }
    else if(field == "firstname"){
      requestedLeadBody["FirstName"] = req.body[field];
    }
    else if(field == "lastname"){
      requestedLeadBody["LastName"] = req.body[field];
    }
    else if(field == "business_name"){
      requestedLeadBody["Company"] = req.body[field];
    }
  }

  //optional fields
  requestedLeadBody["Street"] = req.body.address1 || '';
  requestedLeadBody["City"] = req.body.city || '';
  requestedLeadBody["Country"] = req.body.country || '';
  requestedLeadBody["PostalCode"] = req.body.zip_code || '';
  requestedLeadBody["State"] = req.body.state || '';
  requestedLeadBody["LeadSource"] = "Website";
  requestedLeadBody["RecordType"] = {
    "Name":  "Dealer Qualification"
  };
  requestedLeadBody["Interested_Products__c"] = "";
  if (req.body.products_of_interest){
    if (req.body.products_of_interest.length == 0){
      return res.status(400).json({
        success: false,
        error: "Missing product of interest"
      });
    }
    if(Array.isArray(req.body.products_of_interest)){
      req.body.products_of_interest.forEach(product => {
        requestedLeadBody["Interested_Products__c"] += product+";"
      })
    }else{
      return res.status(400).json({
        success: false,
        error: "Invalid request body Interested_Products__c should be an array"
      });
    }
  }

  requestedLeadBody["Interested_Products__c"] = requestedLeadBody["Interested_Products__c"].slice(0, -1); 

  console.log("Request Demo Form requestedLeadBody: ", requestedLeadBody);

  try {
    // Step 1: Create Lead in Salesforce
    const sfResponse = await axios.post(
      `${process.env.SF_API_BASE}/sobjects/Lead`,
      requestedLeadBody,
      {
        validateStatus: function (status) {
          return status >= 200 && status < 300 || status == 401;
        },
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // If unauthorized, get a new token and retry
    if (sfResponse.status != 201) {
      console.error('Salesforce lead creation failed:', sfResponse.data);
      //get access token again
      access_token = await getSalesforceToken();
      //try one more time
      const sfResponse2 = await axios.post(
        `${process.env.SF_API_BASE}/sobjects/Lead`,
        requestedLeadBody,
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Success
      return res.status(201).json({
        success: true,
        salesforceId: sfResponse2.data.id,
        message: 'Lead created successfully in Salesforce'
      });
    }

    // Success
    return res.status(201).json({
      success: true,
      salesforceId: sfResponse.data.id,
      message: 'Lead created successfully in Salesforce'
    });

  } catch (error) {
    console.error('Lead creation failed:', error.response?.data || error.message);

    const status = error.response?.status || 500;
    const message = error.response?.data || 'Internal server error';

    res.status(status).json({
      success: false,
      error: message
    });
  }
});


app.post('/sf_api/lead/become-a-dealer', async (req, res) => {

  let requestedLeadBody = {};

  // Validate required fields
  if(req.body == undefined || req.body == null){
    return res.status(400).json({
      success: false,
      error: "Missing required request body"
    });
  }

  //configure lead body
  for (const field of requiredLeadData_bad) {
    if (!req.body.hasOwnProperty(field)) {
      return res.status(400).json({
        success: false,
        error: `Missing required field: ${field}`
      });
    }
    if(field == "email"){
      requestedLeadBody["Email"] = req.body[field];
    }
    else if(field == "phone"){
      requestedLeadBody["Phone"] = req.body[field];
    }
    else if(field == "firstname"){
      requestedLeadBody["FirstName"] = req.body[field];
    }
    else if(field == "lastname"){
      requestedLeadBody["LastName"] = req.body[field];
    }
    else if(field == "business_name"){
      requestedLeadBody["Company"] = req.body[field];
    }
  }

  //optional fields
  requestedLeadBody["Street"] = req.body.address1 || '';
  requestedLeadBody["City"] = req.body.city || '';
  requestedLeadBody["Country"] = req.body.country || '';
  requestedLeadBody["PostalCode"] = req.body.zip_code || '';
  requestedLeadBody["State"] = req.body.state || '';
  requestedLeadBody["LeadSource"] = "Website";
  requestedLeadBody["RecordType"] = {
    "Name":  "Dealer Qualification"
  };
  requestedLeadBody["Products_Interested_In_Carrying__c"] = "";
  if (req.body.products_of_carrying){
    if (req.body.products_of_carrying.length == 0){
      return res.status(400).json({
        success: false,
        error: "Missing product of interest"
      });
    }
    if(Array.isArray(req.body.products_of_carrying)){
      req.body.products_of_carrying.forEach(product => {
        requestedLeadBody["Products_Interested_In_Carrying__c"] += product+";"
      })
    }else{
      return res.status(400).json({
        success: false,
        error: "Invalid request body Products_Interested_In_Carrying__c should be an array"
      });
    }
  }

  requestedLeadBody["Current_Brands_Carried__c"] = "";
  if (req.body.current_brands_carried){
    if (req.body.current_brands_carried.length == 0){
      return res.status(400).json({
        success: false,
        error: "Missing current brands carried"
      });
    }
    if(Array.isArray(req.body.current_brands_carried)){
      req.body.current_brands_carried.forEach(product => {
        requestedLeadBody["Current_Brands_Carried__c"] += product+";"
      })
    }else{
      return res.status(400).json({
        success: false,
        error: "Invalid request body Current_Brands_Carried__c should be an array"
      });
    }
  }

  requestedLeadBody["Products_Interested_In_Carrying__c"] = requestedLeadBody["Products_Interested_In_Carrying__c"].slice(0, -1);

  requestedLeadBody["Current_Brands_Carried__c"] = requestedLeadBody["Current_Brands_Carried__c"].slice(0, -1);

  console.log("Become a dealer form requestedLeadBody: ", requestedLeadBody);

  try {
    // Step 1: Create Lead in Salesforce
    const sfResponse = await axios.post(
      `${process.env.SF_API_BASE}/sobjects/Lead`,
      requestedLeadBody,
      {
        validateStatus: function (status) {
          return status >= 200 && status < 300 || status == 401;
        },
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // If unauthorized, get a new token and retry
    if (sfResponse.status != 201) {
      console.error('Salesforce lead creation failed:', sfResponse.data);
      //get access token again
      access_token = await getSalesforceToken();
      //try one more time
      const sfResponse2 = await axios.post(
        `${process.env.SF_API_BASE}/sobjects/Lead`,
        requestedLeadBody,
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Success
      return res.status(201).json({
        success: true,
        salesforceId: sfResponse2.data.id,
        message: 'Lead created successfully in Salesforce'
      });
    }

    // Success
    return res.status(201).json({
      success: true,
      salesforceId: sfResponse.data.id,
      message: 'Lead created successfully in Salesforce'
    });

  } catch (error) {
    console.error('Lead creation failed:', error.response?.data || error.message);

    const status = error.response?.status || 500;
    const message = error.response?.data || 'Internal server error';

    res.status(status).json({
      success: false,
      error: message
    });
  }
});

// Health check
app.get('/sf_api/health_check', (req, res) => {
  res.json({ message: 'Salesforce Lead API is running!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});