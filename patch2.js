const fs = require('fs');
let c = fs.readFileSync('c:\\Users\\Si\\OneDrive\\Desktop\\sms\\SMS-Solar-backend\\views\\quotationTemplate.ejs', 'utf8');

const targetStr = `<section class="page"><div class="kicker">04 · Technical specifications</div><h2>Quality in every connection.</h2><div class="brand-boxes" style="gap:15px; margin-top:30px;"><div class="brand-box"><b style="color:#1d2951">Adani</b><small>Solar</small></div><div class="brand-box"><b style="color:#15865e">Waaree</b><small>Solar</small></div><div class="brand-box"><b style="color:#4a2b64">Pahal</b><small>Solar</small></div><div class="brand-box"><b style="color:#0a3a6a">Goldi</b><small>Solar</small></div><div class="brand-box"><b style="color:#d95c14">Rayzon</b><small>Solar</small></div><div class="brand-box"><b style="color:#34558b">Velox</b><small>Inverter</small></div><div class="brand-box"><b style="color:#1976c9">Solaryaan</b><small>Inverter</small></div><div class="brand-box"><b style="color:#4a4a4a">Hindustan</b><small>Structure</small></div><div class="brand-box"><b style="color:#008b8b">Simens</b><small>DC / AC</small></div><div class="brand-box"><b style="color:#d92128">Polycab</b><small>Cables</small></div></div><div class="footer"><span><b>SMS ENTERPRISE</b></span><span>03</span></div></section>`;

const replacementStr = `<section class="page"><div class="kicker">04 · Technical specifications</div><h2>Quality in every connection.</h2>

<div class="brand-category">
  <h3 style="font-family:'Times New Roman', Times, serif; font-size:18px; margin: 20px 0 10px 0; border-bottom: 1px solid #f0e6f2; padding-bottom: 5px;">Panels</h3>
  <div class="brand-boxes" style="gap:15px; margin-top:10px;">
    <div class="brand-box"><b style="color:#1d2951">ADANI</b><small>SOLAR</small></div>
    <div class="brand-box"><b style="color:#15865e">WAAREE</b><small>SOLAR</small></div>
    <div class="brand-box"><b style="color:#4a2b64">PAHAL</b><small>SOLAR</small></div>
    <div class="brand-box"><b style="color:#0a3a6a">GOLDI</b><small>SOLAR</small></div>
    <div class="brand-box"><b style="color:#d95c14">RAYZON</b><small>SOLAR</small></div>
    <div class="brand-box"><b style="color:#1976c9">AVAADA</b><small>SOLAR</small></div>
  </div>
</div>

<div class="brand-category">
  <h3 style="font-family:'Times New Roman', Times, serif; font-size:18px; margin: 30px 0 10px 0; border-bottom: 1px solid #f0e6f2; padding-bottom: 5px;">Inverter</h3>
  <div class="brand-boxes" style="gap:15px; margin-top:10px;">
    <div class="brand-box"><b style="color:#1976c9">SOLARYAAN</b><small>INVERTER</small></div>
    <div class="brand-box"><b style="color:#34558b">VELOX</b><small>INVERTER</small></div>
    <div class="brand-box"><b style="color:#4a4a4a">VSOLE</b><small>INVERTER</small></div>
  </div>
</div>

<div class="brand-category">
  <h3 style="font-family:'Times New Roman', Times, serif; font-size:18px; margin: 30px 0 10px 0; border-bottom: 1px solid #f0e6f2; padding-bottom: 5px;">Cables</h3>
  <div class="brand-boxes" style="gap:15px; margin-top:10px;">
    <div class="brand-box"><b style="color:#d92128">POLYCAB</b><small>CABLES</small></div>
    <div class="brand-box"><b style="color:#d95c14">RR KABEL</b><small>CABLES</small></div>
  </div>
</div>

<div class="brand-category">
  <h3 style="font-family:'Times New Roman', Times, serif; font-size:18px; margin: 30px 0 10px 0; border-bottom: 1px solid #f0e6f2; padding-bottom: 5px;">Structure</h3>
  <div class="brand-boxes" style="gap:15px; margin-top:10px;">
    <div class="brand-box"><b style="color:#4a4a4a">HINDUSTAN</b><small>STRUCTURE</small></div>
    <div class="brand-box"><b style="color:#00a3e0">APL APOLLO</b><small>STRUCTURE</small></div>
  </div>
</div>

<div class="brand-category">
  <h3 style="font-family:'Times New Roman', Times, serif; font-size:18px; margin: 30px 0 10px 0; border-bottom: 1px solid #f0e6f2; padding-bottom: 5px;">Earthing & Protection</h3>
  <div class="brand-boxes" style="gap:15px; margin-top:10px;">
    <div class="brand-box"><b style="color:#008b8b">SIMENS</b><small>DC / AC</small></div>
  </div>
</div>

<div class="footer"><span><b>SMS ENTERPRISE</b></span><span>03</span></div></section>`;

if (c.includes(targetStr)) {
  c = c.replace(targetStr, replacementStr);
  fs.writeFileSync('c:\\Users\\Si\\OneDrive\\Desktop\\sms\\SMS-Solar-backend\\views\\quotationTemplate.ejs', c, 'utf8');
  console.log('SUCCESS');
} else {
  console.log('FAIL - target not found');
}
