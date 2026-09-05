# JUMI TECH — Flagship Company Website

Premium multi-page technology company website built with clean HTML, CSS and JavaScript.

## Included
- 12 responsive routes: Home, About, Services, Solutions, Products, Projects, Case Studies, Process, Why Jumi Tech, Insights, Careers, Contact.
- Responsive mobile navigation, active navigation states and smooth route transitions.
- Scroll reveal animations, portfolio filtering, FAQ/interactive UI, back-to-top control and WhatsApp CTA.
- Contact form with browser validation and asynchronous Formspree submission handling.
- SEO metadata, Open Graph metadata, semantic markup, accessibility-friendly labels/status messaging and favicon.
- Netlify and Vercel deployment configuration.

## Connect the Contact Form to Formspree

The contact form is already wired for Formspree, but Formspree requires **your own form ID**. Do this once before publishing:

1. Create/sign in to your Formspree account.
2. Create a new form and set the destination email to **jumiunlimited@gmail.com** (or your preferred business inbox).
3. Copy the endpoint Formspree gives you. It will look similar to:
   `https://formspree.io/f/xxxxxxxxxxxxxxxx`
4. Open `js/app.js` and find:
   `https://formspree.io/f/YOUR_FORMSPREE_FORM_ID`
5. Replace `YOUR_FORMSPREE_FORM_ID` with the ID from your Formspree endpoint. For example:
   `https://formspree.io/f/xxxxxxxxxxxxxxxx`
6. Save the file and deploy the folder/ZIP to Netlify or Vercel.

### What happens after setup
- Visitor submits the form.
- JavaScript sends the form to Formspree without leaving the page.
- The visitor sees a professional success or error message.
- Formspree delivers the enquiry to the email destination configured in your Formspree dashboard.

**Important:** Do not put your Formspree account password or API secret in the website code. The public form endpoint is all the frontend needs.

## Deploy on Netlify
1. Extract the ZIP.
2. Upload the `Jumi_Tech_Flagship` folder to Netlify, or connect the Git repository.
3. No build command is required.

## Deploy on Vercel
1. Import the project into Vercel.
2. Framework preset: Other.
3. No build command is required.
4. Deploy.

## Local preview
Open `index.html` in a browser, or use VS Code Live Server for the smoothest local experience.


## Formspree Contact Form
The contact form is connected to Formspree endpoint `https://formspree.io/f/xzebazao` and submits asynchronously using the existing vanilla JavaScript. In your Formspree dashboard, make sure the form email destination is verified/configured before launch. No backend is required.
