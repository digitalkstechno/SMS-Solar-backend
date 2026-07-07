const fs = require('fs');
let content = fs.readFileSync('controller/lead.js', 'utf8');

content = content.replace(/const \{ ([^}]*staff[^}]*) \} = req.query;/g, (match, p1) => {
  if (!p1.includes('source')) {
    return 'const { ' + p1 + ', source } = req.query;';
  }
  return match;
});

const staffRegex = /if \(staff\) \{\s*const staffArr = staff\.split\([^}]+\}\s*\} else if \([^}]+\}\s*\}/g;
content = content.replace(staffRegex, (match) => {
  const isQuery = match.includes('query.assignedTo');
  const isMatchObj = match.includes('match.assignedTo');
  const isAndConditions = match.includes('andConditions.push');
  const isConditions = match.includes('conditions.push');

  let sourceBlock = '\n\n    if (source) {\n      const sourceArr = source.split(\",\").map(s => s.trim()).filter(Boolean);\n';
  
  if (isQuery) {
    sourceBlock += '      if (sourceArr.length === 1) {\n        query.leadrefrance = sourceArr[0];\n      } else if (sourceArr.length > 1) {\n        query.leadrefrance = { $in: sourceArr };\n      }\n    }';
  } else if (isMatchObj) {
    sourceBlock += '      if (sourceArr.length === 1) {\n        match.leadrefrance = sourceArr[0];\n      } else if (sourceArr.length > 1) {\n        match.leadrefrance = { $in: sourceArr };\n      }\n    }';
  } else if (isAndConditions) {
    sourceBlock += '      andConditions.push({ leadrefrance: { $in: sourceArr } });\n    }';
  } else if (isConditions) {
    sourceBlock += '      conditions.push({ leadrefrance: { $in: sourceArr } });\n    }';
  } else {
    sourceBlock = '';
  }

  return match + sourceBlock;
});

fs.writeFileSync('controller/lead.js', content);
console.log('Script completed.');
