// backend/config/businessConfig.js
// Authoritative business & GST configuration
// Enforces that no fake or unverified GSTIN is ever displayed in production receipts/invoices

function getBusinessConfig() {
  const rawGstin = (process.env.ALLVER_GSTIN || process.env.BUSINESS_GSTIN || '').trim();

  // Valid Indian GSTIN format: 2 state digits + 10 PAN chars + 1 entity num + 1 'Z' + 1 checksum
  // E.g. 27AAAAA0000A1Z5
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const isGstRegistered = Boolean(rawGstin && gstinRegex.test(rawGstin));

  return {
    companyName: process.env.BUSINESS_LEGAL_NAME || 'Allver Technologies Pvt. Ltd.',
    gstin: isGstRegistered ? rawGstin : null,
    isGstRegistered,
    documentType: isGstRegistered ? 'TAX_INVOICE' : 'PAYMENT_RECEIPT',
    documentTitle: isGstRegistered ? 'Official Tax Invoice & Payment Receipt' : 'Official Payment Receipt',
    supportEmail: process.env.BUSINESS_SUPPORT_EMAIL || 'support@allver.app',
    supportPhone: process.env.BUSINESS_SUPPORT_PHONE || '+91 1800 123 4567',
    address: process.env.BUSINESS_ADDRESS || 'Allver Headquarters, Hiranandani Estate, Thane, Maharashtra 400607',
    website: process.env.BUSINESS_WEBSITE || 'https://allver.app'
  };
}

module.exports = {
  getBusinessConfig
};
