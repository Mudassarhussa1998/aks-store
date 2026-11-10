/**
 * Copy for the About, Careers, Contact and FAQ pages. Replace the [bracketed] details with your real
 * information before launch; everything else is ready to use as it is.
 */

export const CONTACT = {
  whatsapp: "[+92 3XX XXXXXXX]",
  whatsappLink: "", // e.g. "https://wa.me/923001234567" — the WhatsApp button appears once this is set
  email: "[hello@rawaj.pk]",
  phone: "[+92 42 XXXX XXXX]",
  hours: "Monday to Saturday, 10am – 7pm",
  address: "[Your warehouse or office address], Lahore, Pakistan",
};

/** Your social profiles. Filled-in ones show in the footer and tell Google they belong to this store. */
export const SOCIAL: { name: string; url: string }[] = [
  { name: "Instagram", url: "" }, // e.g. "https://www.instagram.com/rawaj.pk"
  { name: "Facebook", url: "" },
  { name: "TikTok", url: "" },
  { name: "YouTube", url: "" },
];

export const ABOUT = {
  intro: "Rawaj is a Pakistani home and clothing brand. We make the everyday things you live in — the kurta you wear to work, the blanket on your bed, the towel after a long day — and we make them properly.",
  story: [
    "Rawaj (رواج) means tradition, the things that quietly become part of everyday life. That's what we want our clothes and home essentials to be: the pieces you reach for every day, year after year.",
    "Rawaj began with a simple frustration: good fabric was either too expensive or too hard to trust online. You couldn't feel the weight of a blanket through a screen, or know if a lawn suit would fade after two washes.",
    "So we built a store around honesty. Every product comes in clear qualities with real weights and fabric details, prices are fair and shown up front, and you pay only when the parcel is in your hands.",
    "[Add your founding story: who started Rawaj, where, and why.]",
  ],
  values: [
    { title: "Fabric first", text: "We choose cotton, lawn and fleece by feel and weight, then test every batch before it reaches you." },
    { title: "Fair, clear prices", text: "One price for every size, colour and quality, shown before you order. No surprises at the door." },
    { title: "Pay when it arrives", text: "Cash on Delivery across Pakistan, with a call to confirm every order before it ships." },
    { title: "Easy to return", text: "Seven days to return unused items. If something isn't right, we'll make it right." },
  ],
  numbers: [
    { value: "Free", label: "delivery on orders over Rs 3,000" },
    { value: "2–4", label: "days delivery in major cities" },
    { value: "7", label: "days to return or exchange" },
    { value: "100%", label: "Cash on Delivery available" },
  ],
};

export const CAREERS = {
  intro: "We're a small team that cares about good fabric and treating customers well. If that sounds like you, we'd love to hear from you.",
  perks: [
    "Competitive salary, paid on time",
    "Staff discount on everything we sell",
    "Training and room to grow as we do",
    "A respectful, friendly team",
  ],
  roles: [
    {
      title: "Customer Care Associate",
      type: "Full-time",
      location: "Lahore",
      text: "Confirm Cash on Delivery orders by phone and WhatsApp, answer questions and look after returns.",
      needs: ["Clear spoken Urdu and good written English", "Patient and organised", "Comfortable with WhatsApp and a computer"],
    },
    {
      title: "Warehouse & Dispatch Associate",
      type: "Full-time",
      location: "Lahore",
      text: "Pick, quality-check and pack orders, and hand them over to our courier partners every day.",
      needs: ["Careful with details", "Able to stand and lift parcels", "Experience in a warehouse is a plus"],
    },
    {
      title: "Social Media & Content Creator",
      type: "Part-time or freelance",
      location: "Remote",
      text: "Plan and shoot photos, reels and stories that show our products the way customers live with them.",
      needs: ["A portfolio of your work", "Eye for styling and light", "Knows Instagram, TikTok and Facebook"],
    },
  ],
};

export const FAQ: { section: string; items: { q: string; a: string }[] }[] = [
  {
    section: "Orders & payment",
    items: [
      { q: "How do I pay?", a: "Cash on Delivery: you pay the rider in cash when your parcel arrives. Card, JazzCash and Easypaisa payments are coming soon." },
      { q: "Why did someone call me after I ordered?", a: "We call or WhatsApp to confirm every Cash on Delivery order before it ships. It takes a minute and helps your parcel reach you quickly." },
      { q: "Can I cancel or change my order?", a: "Yes, until it ships. Open My Account → My orders (or Track your order) and choose Cancel order, then place a new one with the right items." },
      { q: "Do I need an account to order?", a: "No. You can check out as a guest. An account lets you track orders, save addresses and keep a wishlist." },
    ],
  },
  {
    section: "Delivery",
    items: [
      { q: "How long does delivery take?", a: "2–4 working days in major cities and 5–7 working days elsewhere in Pakistan." },
      { q: "How much is delivery?", a: "Free on orders over Rs 3,000. Below that, a flat Rs 250 delivery charge applies." },
      { q: "How do I track my parcel?", a: "We send a tracking number by SMS when your order ships. You can also use the Track your order page with your order number and mobile number." },
    ],
  },
  {
    section: "Returns & exchanges",
    items: [
      { q: "What is your return policy?", a: "You can return or exchange unused items with tags within 7 days of delivery. Opened pillows and inner wear can't be returned unless faulty." },
      { q: "How do I start a return?", a: "Message us from the Contact page or on WhatsApp with your order number, and we'll arrange the pickup." },
    ],
  },
  {
    section: "Products",
    items: [
      { q: "What do Standard, Premium and Luxury mean?", a: "They are fabric weights. For blankets, Standard is about 300 GSM (light), Premium about 450 GSM (double layer) and Luxury about 600 GSM (heavy, sherpa-lined)." },
      { q: "How do I pick the right size?", a: "Each product lists its sizes with measurements. If you're between sizes in clothing, we suggest the larger one." },
      { q: "How should I wash my items?", a: "Care instructions are on every product page under Material & care. Most of our cotton and fleece can be machine-washed cold." },
    ],
  },
  {
    section: "Your account",
    items: [
      { q: "Can I sign in with Google or Facebook?", a: "Yes. Choose Continue with Google or Continue with Facebook on the sign-in page. We'll only ask for your mobile number so couriers can reach you." },
      { q: "I forgot my password.", a: "Choose Forgot password? on the sign-in page and we'll send a 6-digit code to your email or verified mobile number." },
      { q: "How do I delete my account?", a: "Go to My Account → Profile → Delete account. See Deleting your data for exactly what's removed." },
    ],
  },
];
