const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
const logEl=$("#log"), headline=$("#headline"), sub=$("#subline"), orb=$("#orb"), mic=$("#mic");
let deferredPrompt=null, timerInterval=null, timerSeconds=0;

const state={
  notes:JSON.parse(localStorage.getItem("lana_notes")||"[]"),
  tasks:JSON.parse(localStorage.getItem("lana_tasks")||"[]"),
  history:JSON.parse(localStorage.getItem("lana_history")||"[]"),reminders:JSON.parse(localStorage.getItem("lana_reminders")||"[]"),voiceName:localStorage.getItem("lana_voice")||""
};

function save(){localStorage.setItem("lana_notes",JSON.stringify(state.notes));localStorage.setItem("lana_tasks",JSON.stringify(state.tasks));localStorage.setItem("lana_history",JSON.stringify(state.history));localStorage.setItem("lana_reminders",JSON.stringify(state.reminders));if(state.voiceName)localStorage.setItem("lana_voice",state.voiceName)}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function addLog(who,text){state.history.push({who,text,t:Date.now()});if(state.history.length>40)state.history.shift();save();renderLog()}
function renderLog(){logEl.innerHTML=state.history.slice(-12).map(x=>`<div class="msg"><b>${esc(x.who)}:</b> ${esc(x.text)}</div>`).join("");logEl.scrollTop=logEl.scrollHeight}
function toast(t){const x=$("#toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),1800)}
function speak(text){
  headline.textContent = text;
  addLog("Lana", text);

  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    toast("Speech is not available in this browser");
    return;
  }

  const synth = window.speechSynthesis;
  synth.cancel();
  try { synth.resume(); } catch(e) {}

  const utterance = new SpeechSynthesisUtterance(String(text));
  utterance.rate = 0.92;
  utterance.pitch = 1.12;
  utterance.volume = 1.0;
  utterance.lang = "en-IN";

  const voices = synth.getVoices();
  const preferredNames = ["Samantha","Ava","Karen","Moira","Victoria","Allison","Zoe"];
  let voice = state.voiceName ? voices.find(v => v.name === state.voiceName) : null;
  if (!voice) voice = voices.find(v => preferredNames.some(n => v.name.toLowerCase().includes(n.toLowerCase())));
  if (!voice) voice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith("en"));
  if (voice) { utterance.voice = voice; utterance.lang = voice.lang || "en-IN"; }

  // Speak immediately. Do not wait for onvoiceschanged: on iPhone/Safari that
  // can move speech outside the user's tap gesture and prevent playback.
  synth.speak(utterance);
}

function open(url){location.href=url}
function searchGoogle(q){open("https://www.google.com/search?q="+encodeURIComponent(q))}
function searchYouTube(q){open("https://www.youtube.com/results?search_query="+encodeURIComponent(q))}

function status(){const b=$("#battery"),n=$("#network");if(navigator.getBattery){navigator.getBattery().then(x=>{b.textContent=Math.round(x.level*100)+"%"})}else b.textContent="N/A";n.textContent=navigator.onLine?"ONLINE":"OFFLINE"}
function clock(){const d=new Date();$("#clock").textContent=d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
setInterval(clock,1000);clock();status();renderLog();

function vibrate(pattern=[30]){try{navigator.vibrate?.(pattern)}catch{}}
function calculate(expr){const clean=expr.replace(/^(calculate|calc)\s*/i,"").replace(/[^0-9+\-*/().%\s]/g,"");if(!clean.trim())throw Error();const value=Function("return ("+clean+")")();if(typeof value!=="number"||!Number.isFinite(value))throw Error();return Math.round(value*1e8)/1e8}
async function weather(){if(!navigator.geolocation){speak("Location is not available on this device.");return} speak("Getting your local weather.");navigator.geolocation.getCurrentPosition(async pos=>{try{const {latitude,longitude}=pos.coords;const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`);const d=await r.json(),c=d.current;const labels={0:"clear sky",1:"mainly clear",2:"partly cloudy",3:"overcast",45:"foggy",48:"foggy",51:"light drizzle",53:"drizzle",61:"light rain",63:"rain",65:"heavy rain",71:"light snow",73:"snow",75:"heavy snow",80:"rain showers",81:"rain showers",82:"heavy showers",95:"thunderstorm"};const desc=labels[c.weather_code]||"mixed conditions";speak(`It is ${Math.round(c.temperature_2m)} degrees with ${desc}. Feels like ${Math.round(c.apparent_temperature)} degrees.`);const w=document.querySelector("#weatherResult");if(w)w.innerHTML=`<b>${Math.round(c.temperature_2m)}°C</b><span>${desc}</span><span>Feels ${Math.round(c.apparent_temperature)}°C · Humidity ${c.relative_humidity_2m}% · Wind ${Math.round(c.wind_speed_10m)} km/h</span>`}catch{speak("I could not reach the weather service right now.")}},()=>speak("Location permission is needed for local weather."))}
function createReminder(text,minutes){const due=Date.now()+minutes*60000;state.reminders.push({text,due});save();setTimeout(()=>{speak("Reminder: "+text);vibrate([100,60,100]);toast("Reminder: "+text)},Math.max(1000,minutes*60000));speak(`Reminder set for ${minutes} minutes from now.`)}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="lana-backup.json";a.click();URL.revokeObjectURL(a.href);toast("Backup exported")}
function openCalculator(){openPanel("calculator")}

function process(raw){
  const command=raw.trim(); const c=command.toLowerCase(); if(!command)return;
  addLog("You",command); $("#command").value=""; sub.textContent="Processing...";
  if(c==="lana"||c.includes("hey lana")){speak("Yes. I'm listening.");sub.textContent="What do you need?";return}
  if(c.startsWith("calculate ")||c.startsWith("calc ")){try{speak("The answer is "+calculate(command))}catch{speak("I could not calculate that safely.")}return}
  if(c.includes("weather")){weather();return}
  const rm=c.match(/^remind me (?:in )?(\d+)\s*(minute|minutes|min|mins|hour|hours)\s*(?:to|that)?\s*(.*)$/);if(rm){createReminder(rm[3]||"check this",Number(rm[1])*(rm[2].startsWith("hour")?60:1));return}
  if(c.includes("vibrate")){vibrate([80,50,80]);speak("Haptic signal sent.");return}
  if(c.includes("what is my status")||c.includes("whats my status")||c==="status"){speak(`System online. You have ${state.tasks.filter(t=>!t.done).length} active tasks and ${state.notes.length} saved notes.`);return}
  if(c.includes("open youtube")){speak("Opening YouTube.");setTimeout(()=>open("https://www.youtube.com/"),450);return}
  if(c.includes("open google")){speak("Opening Google.");setTimeout(()=>open("https://www.google.com/"),450);return}
  if(c.startsWith("search google for ")){speak("Searching Google.");setTimeout(()=>searchGoogle(command.slice(18)),450);return}
  if(c.startsWith("search youtube for ")){speak("Searching YouTube.");setTimeout(()=>searchYouTube(command.slice(19)),450);return}
  if(c.startsWith("play ")){const q=command.slice(5);speak("Finding "+q+" on YouTube.");setTimeout(()=>searchYouTube(q),450);return}
  if(c.includes("focus timer")||c.includes("start a 25 minute")){openPanel("timer");startTimer(25*60);speak("Focus mode started for 25 minutes.");return}
  if(c.startsWith("add task ")) {const t=command.slice(9).trim();state.tasks.push({text:t,done:false});save();speak("Task added.");return}
  if(c.startsWith("remember ")) {const n=command.slice(9).trim();state.notes.push(n);save();speak("Saved to memory.");return}
  if(c.includes("show my tasks")){openPanel("tasks");speak("Opening your mission list.");return}
  if(c.includes("show my notes")){openPanel("notes");speak("Opening memory.");return}
  if(c.includes("who are you")||c.includes("about yourself")){speak("I'm Lana. Your local-first iPhone assistant. I can talk, search, manage tasks and notes, run focus sessions, and act as your command center.");return}
  if(c.includes("time")){speak("It is "+new Date().toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}));return}
  speak("I can handle voice commands, web search, YouTube, tasks, notes, focus mode, and iPhone utilities. Try asking me to add a task or remember something.");
}

// Voice recognition is intentionally disabled for this iPhone/local build.
// Talk to Lana opens the text command field instead. Lana still speaks her responses using Speech Synthesis.
mic.onclick=()=>{
  mic.classList.add("listening");
  orb.classList.add("listening");
  $("#status").textContent="TEXT COMMAND MODE";
  sub.textContent="Voice recognition isn't supported here. Type a command below.";
  toast("Type a command — Lana will speak the response.");
  $("#command").focus();
  setTimeout(()=>{mic.classList.remove("listening");orb.classList.remove("listening");$("#status").textContent="SYSTEM ONLINE"},900);
};

$("#send").onclick=()=>process($("#command").value);
$("#command").addEventListener("keydown",e=>{if(e.key==="Enter")process(e.target.value)});
$$("[data-cmd]").forEach(b=>b.onclick=()=>process(b.dataset.cmd));
$("#clearLog").onclick=()=>{state.history=[];save();renderLog();toast("Activity cleared")};

function openPanel(type){
 const dlg=$("#panel"), title=$("#panelTitle"), body=$("#panelBody"); dlg.showModal();
 if(type==="tasks"){title.textContent="Mission Control";body.innerHTML=`<div class="form"><input id="taskText" placeholder="New mission..."><button id="addTask">Add mission</button></div><div class="list">${state.tasks.length?state.tasks.map((t,i)=>`<div class="item"><input type="checkbox" data-task="${i}" ${t.done?"checked":""}><span style="${t.done?"text-decoration:line-through;opacity:.5":""}">${esc(t.text)}</span><button data-del-task="${i}">×</button></div>`).join(""):"<p style='color:#888'>No missions yet.</p>"}</div>`; 
  $("#addTask").onclick=()=>{const v=$("#taskText").value.trim();if(v){state.tasks.push({text:v,done:false});save();openPanel("tasks")}};$$("[data-task]").forEach(x=>x.onchange=()=>{state.tasks[+x.dataset.task].done=x.checked;save();openPanel("tasks")});$$("[data-del-task]").forEach(x=>x.onclick=()=>{state.tasks.splice(+x.dataset.delTask,1);save();openPanel("tasks")});
 }
 if(type==="notes"){title.textContent="Memory Vault";body.innerHTML=`<div class="form"><textarea id="noteText" rows="3" placeholder="Save something to Lana's memory..."></textarea><button id="addNote">Save memory</button></div><div class="list">${state.notes.length?state.notes.map((n,i)=>`<div class="item"><span>✦ ${esc(n)}</span><button data-del-note="${i}">×</button></div>`).join(""):"<p style='color:#888'>Memory is empty.</p>"}</div>`;$("#addNote").onclick=()=>{const v=$("#noteText").value.trim();if(v){state.notes.push(v);save();openPanel("notes")}};$$("[data-del-note]").forEach(x=>x.onclick=()=>{state.notes.splice(+x.dataset.delNote,1);save();openPanel("notes")})}
 if(type==="calculator"){title.textContent="Lana Calculator";body.innerHTML=`<div class="form"><input id="calcInput" inputmode="decimal" placeholder="25 * 4 + 10"><button class="primary" id="calcGo">Calculate</button></div><div class="timer" id="calcResult">0</div>`;$("#calcGo").onclick=()=>{try{$("#calcResult").textContent=calculate($("#calcInput").value)}catch{$("#calcResult").textContent="Invalid"}}}
 if(type==="weather"){title.textContent="Live Weather";body.innerHTML=`<div id="weatherResult" class="weather-card"><b>--°C</b><span>Tap refresh for local weather</span><button class="primary" id="weatherGo">Refresh weather</button></div>`;$("#weatherGo").onclick=weather}
 if(type==="voice"){title.textContent="Lana Voice Lab";const vs=speechSynthesis.getVoices();body.innerHTML=`<div class="form"><select id="voiceSelect">${vs.filter(v=>v.lang.toLowerCase().startsWith("en")).map(v=>`<option ${v.name===state.voiceName?"selected":""}>${esc(v.name)}</option>`).join("")}</select><button class="primary" id="saveVoice">Use this voice</button><button id="testVoice">Test Lana voice</button></div><p style="color:#aaa">Voice availability depends on iPhone/iOS.</p>`;$("#saveVoice").onclick=()=>{state.voiceName=$("#voiceSelect").value;save();speak("Voice profile updated.")};$("#testVoice").onclick=()=>speak("Hello. I am Lana. Voice systems are online.")}
 if(type==="timer"){title.textContent="Focus Reactor";body.innerHTML=`<div class="timer" id="timerDisplay">${formatTime(timerSeconds||1500)}</div><div class="timer-actions"><button class="primary" id="start25">25 MIN</button><button id="start5">5 MIN</button><button id="stopTimer">STOP</button></div>`;$("#start25").onclick=()=>startTimer(1500);$("#start5").onclick=()=>startTimer(300);$("#stopTimer").onclick=()=>stopTimer()}
 if(type==="tools"){title.textContent="Utility Deck";body.innerHTML=`<div class="list"><div class="item">📱 Device <span style="margin-left:auto">${navigator.userAgent.includes("iPhone")?"iPhone":"Browser"}</span></div><div class="item">🌐 Connection <span style="margin-left:auto">${navigator.onLine?"Online":"Offline"}</span></div><div class="item">🔋 Battery <span style="margin-left:auto" id="dlgBattery">Checking…</span></div><div class="item"><button style="margin:0;border:0;background:none" id="shareTool">↗ Share Lana</button></div></div>`;if(navigator.getBattery)navigator.getBattery().then(b=>$("#dlgBattery").textContent=Math.round(b.level*100)+"%");$("#shareTool").onclick=share}
}
function formatTime(s){return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}
function startTimer(s){stopTimer();timerSeconds=s;openPanel("timer");$("#timerDisplay").textContent=formatTime(timerSeconds);timerInterval=setInterval(()=>{timerSeconds--;$("#timerDisplay").textContent=formatTime(timerSeconds);if(timerSeconds<=0){stopTimer();speak("Focus session complete. Nice work.");toast("Focus complete")}},1000)}
function stopTimer(){if(timerInterval)clearInterval(timerInterval);timerInterval=null}
$$("[data-panel]").forEach(b=>b.onclick=()=>openPanel(b.dataset.panel));
$("#closePanel").onclick=()=>$("#panel").close();

async function share(){if(navigator.share){try{await navigator.share({title:"Lana",text:"My Lana AI iPhone assistant",url:location.href})}catch{}}else{navigator.clipboard?.writeText(location.href);toast("Link copied")}}
$("#shareBtn").onclick=share;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e});
$("#installBtn").onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null}else toast("On iPhone: Share → Add to Home Screen")};

if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
state.reminders.filter(r=>r.due>Date.now()).forEach(r=>setTimeout(()=>{speak("Reminder: "+r.text);vibrate([100,60,100])},r.due-Date.now()));
speak("Lana is awake."); sub.textContent="Say “Lana” or tap the microphone.";
