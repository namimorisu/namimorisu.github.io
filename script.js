const navBar = document.getElementById("nav");
const loginArea = document.getElementById("loginArea");
const passwordBox = document.getElementById('password');
const username = document.getElementById("username");
const submitButton = document.getElementById("submitButton");
const logOutButton = document.getElementById("logoutButton");
const app = document.getElementById("app");
const welcomeMessage = document.getElementById("welcomeMessage");
const auditTextBox = document.getElementById("auditTextBox");
const auditTextBox2 = document.getElementById("auditTextBox2");

async function apiCall(url, options) {
  try {
      const response = await fetch(url, options);
      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Network response was not ok');
      }
      return await response.json();
  } catch (error) {
      console.error("API Call Failed:", error.message);
      throw error; 
  }
}

submitButton.addEventListener('click', handleLogin);
logOutButton.addEventListener('click', handleLogout);

async function handleLogin(e) {
e.preventDefault();
const credentials = btoa(`${username.value}:${passwordBox.value}`);
try {
    const token = await apiCall("https://01.kood.tech/api/auth/signin", {
        method: 'POST',
        headers: { Authorization: `Basic ${credentials}` }
    });
    console.log("Login successful");
    sessionStorage.setItem('jwt', JSON.stringify(token)); 
    loadMainPage(token);
    document.getElementById("logoutButton").style.display = "block"; // Make the logout button visible
} catch (error) {
    alert("Login failed: " + error.message);
}
}

function handleLogout() {
toggleDisplay([loginArea], true);
toggleDisplay([navBar, app], false);
sessionStorage.removeItem("jwt"); 
document.getElementById("logoutButton").style.display = "none"; 
}

function toggleDisplay(elements, show) {
  elements.forEach(element => {
      element.style.display = show ? "flex" : "none";
  });
}

async function loadMainPage(token) {
  toggleDisplay([app, navBar], true);
  toggleDisplay([loginArea], false);
  navBar.style.display = "flex";
  const dataArr = await getDataFromGraphql(token);
  BuildColumnGraphData(dataArr[0])
  GeneratePieGraph(dataArr[1], dataArr[2])
}

function parseJwt(token) {
const base64Url = token.split('.')[1];
const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
}).join(''));
return JSON.parse(jsonPayload);
}

const getDataFromGraphql = async(token)=> {
  let results = await fetch('https://01.kood.tech/api/graphql-engine/v1/graphql', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        query: `{
          user {
            id
            attrs
            auditRatio
            totalUp
            totalDown
            transactions(order_by: { createdAt: desc }) {
              id
              type
              amount
              createdAt
              path
            }
            xps {
              event {
                id
              }
              amount
              path
            }
          }
          xp_total: transaction_aggregate(where: {type: {_eq: "xp"}, eventId: {_eq: 20}}) {
            aggregate {
              sum {
                amount
              }
            }
          }
        }`
      })
    })
  let data = await results.json();

  // XP
  const xps = data.data.user[0].xps.filter((item) => !item.path.includes('piscine'));
  let totalAmount = 0;
  for (let i = 0; i < xps.length; i++) {
    let amount = xps[i].amount;
    totalAmount += amount;
  }
  totalAmount = Math.round(totalAmount / 1000) + ' kB';

  const userObj = data.data.user[0]
  const firstName = userObj.attrs.firstName
  const lastName = userObj.attrs.lastName;
  const phone = userObj.attrs.tel;
  const mail = userObj.attrs.email;
  welcomeMessage.innerHTML = "Welcome, " + "<br>" + firstName +lastName + "<br>"+ "<br>" + phone + "<br>" + mail + "<br>" +totalAmount;
  //get data to build audit audit ratio graph
  const auditRatio = userObj.auditRatio
  let auditUp = userObj.totalUp
  let auditDown = userObj.totalDown
  auditUp = Math.ceil(auditUp/1000)/1000
  auditDown = Math.ceil(auditDown/1000)/1000
  auditTextBox2.innerHTML = "↓ You have received audits points over time (kB)";
  auditTextBox.innerHTML = "Your audit ratio is: " + roundUpToDecimal(auditRatio, 2) +"%";
  let lineData = [];
  const monthsExtended = [
  "Nov 2022", "Dec 2022",
  "Jan 2023", "Feb 2023", "Mar 2023", "Apr 2023", "May 2023", "Jun 2023",
  "Jul 2023", "Aug 2023", "Sep 2023", "Oct 2023", "Nov 2023", "Dec 2023",
  "Jan 2024", "Feb 2024"
  ];
  monthsExtended.forEach(monthYear => {
  lineData.push({ monthYear: monthYear, value: 0 });
  });
  userObj.transactions.forEach(element => {
  if (element.type === "xp" && !element.path.includes("piscine")) {
      const createdAt = new Date(element.createdAt);
      const year = createdAt.getFullYear();
      const monthYear = `${new Intl.DateTimeFormat('en', { month: 'short' }).format(createdAt)} ${year}`;
      const lineDataIndex = lineData.findIndex(item => item.monthYear === monthYear);
      if (lineDataIndex !== -1) {
          lineData[lineDataIndex].value += Math.ceil(element.amount / 1000);
        }
    }
  });
  return [lineData, auditUp, auditDown]
}

function roundUpToDecimal(number, decimalPlaces) {
const factor = 10 ** decimalPlaces;
return Math.ceil(number * factor) / factor;
}

function GeneratePieGraph(doneInt, receivedInt) {
const newData = [
  { label: "↑ Done", value: doneInt, unit: "MB" },
  { label: "↓ Received", value: receivedInt, unit: "MB" },
];
const svgContainer = document.getElementById("pieChart");
const totalValue = newData.reduce((total, item) => total + item.value, 0);
const pieWidth = 300;
const pieHeight = 300;
const centerX = pieWidth / 2;
const centerY = pieHeight / 2;
svgContainer.innerHTML = '';
const colors = ["transparent", "#116178"]; // Using transparent for one part for a visual effect
let startAngle = 0;
newData.forEach((item, index) => {
  const percentage = item.value / totalValue;
  const endAngle = startAngle + percentage * 2 * Math.PI;
  const x1 = centerX + Math.cos(startAngle) * (pieWidth / 2);
  const y1 = centerY + Math.sin(startAngle) * (pieHeight / 2);
  const x2 = centerX + Math.cos(endAngle) * (pieWidth / 2);
  const y2 = centerY + Math.sin(endAngle) * (pieHeight / 2);
  const largeArcFlag = percentage > 0.5 ? 1 : 0;
  const pathData = `M ${centerX},${centerY} L ${x1},${y1} A ${pieWidth / 2} ${pieHeight / 2} 0 ${largeArcFlag} 1 ${x2},${y2} Z`;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);
  path.setAttribute("fill", colors[index % colors.length]);
  path.setAttribute("stroke", "black"); 
  path.setAttribute("stroke-width", "1");
  svgContainer.appendChild(path);
  // Modifying tooltip to include the value and unit ("MB")
  const tooltipX = centerX + Math.cos(startAngle + percentage * Math.PI) * (pieWidth / 4);
  const tooltipY = centerY + Math.sin(startAngle + percentage * Math.PI) * (pieHeight / 4);
  const tooltipText = `${item.label}: ${item.value.toFixed(2)} ${item.unit}`;
  const tooltip = document.createElementNS("http://www.w3.org/2000/svg", "text");
  tooltip.setAttribute("x", tooltipX);
  tooltip.setAttribute("y", tooltipY);
  tooltip.setAttribute("text-anchor", "middle");
  tooltip.setAttribute("alignment-baseline", "middle");
  tooltip.setAttribute("fill", "black");
  tooltip.textContent = tooltipText;
  svgContainer.appendChild(tooltip);
  startAngle = endAngle;
});
svgContainer.setAttribute("viewBox", `0 0 ${pieWidth} ${pieHeight}`);
}

function BuildColumnGraphData(data) {
const svgContainer = document.getElementById("columnChart");
const minValue = 0;
const maxValue = Math.max(...data.map((item) => item.value));
const graphWidth = 1000; 
const graphHeight = 200;
const margin = { top: 20, right: 20, bottom: 50, left: 40 }; 
const columnWidth = (graphWidth - margin.left - margin.right) / data.length;
const yScale = (graphHeight - margin.top - margin.bottom) / (maxValue - minValue);
svgContainer.innerHTML = '';
data.forEach((point, index) => {
  const columnHeight = (point.value - minValue) * yScale;
  const column = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  column.setAttribute("x", margin.left + index * columnWidth);
  column.setAttribute("y", graphHeight - margin.bottom - columnHeight);
  column.setAttribute("width", columnWidth * 0.8); 
  column.setAttribute("height", columnHeight);
  column.setAttribute("fill", "#116178"); 
  column.setAttribute("stroke", "black"); 
  column.setAttribute("stroke-width", "1");
  svgContainer.appendChild(column);
  // Tooltip showing the value
  const tooltip = document.createElementNS("http://www.w3.org/2000/svg", "text");
  tooltip.setAttribute("x", margin.left + index * columnWidth + (columnWidth * 0.4)); 
  tooltip.setAttribute("y", graphHeight - margin.bottom - columnHeight - 10);
  tooltip.setAttribute("text-anchor", "middle");
  tooltip.setAttribute("font-size", "12px");
  tooltip.textContent = point.value;
  svgContainer.appendChild(tooltip);
  // Label showing the month and year
  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("x", margin.left + index * columnWidth + (columnWidth * 0.4)); 
  label.setAttribute("y", graphHeight - margin.bottom + 20);
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("font-size", "10px"); 
  label.textContent = point.monthYear; 
  svgContainer.appendChild(label);
});
}
