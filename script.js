"use strict";

const LIGHT_MPS = 299792458;
const AU_METRES = 149597870700;
const YEAR_SECONDS = 365.25 * 24 * 60 * 60;
const RACERS = [
  {id:"you",label:"You",speedMps:null,speedType:"Measured average",description:"Average speed over your run",icon:"🏃"},
  {id:"mbappe",label:"Kylian Mbappé",speedMps:10.89,speedType:"Illustrative peak",description:"Approximate reported sprint peak",icon:"⚽"},
  {id:"cheetah",label:"Cheetah",speedMps:29,speedType:"Short-burst peak",description:"Approximate speed in a short burst",icon:"🐆"},
  {id:"jet",label:"Lockheed SR-71 Blackbird",speedMps:980.56,speedType:"Fast jet flight",description:"Approximate speed of a crewed jet",icon:"✈️"},
  {id:"light",label:"Light in vacuum",speedMps:LIGHT_MPS,speedType:"Exact constant",description:"Light travelling through empty space",icon:"✦"}
];
const PLANETS = [
  {id:"mercury",name:"Mercury",distanceAU:0.387,color:"#b7b1a7"},
  {id:"venus",name:"Venus",distanceAU:0.723,color:"#e2b983"},
  {id:"earth",name:"Earth",distanceAU:1,color:"#5fa9d2"},
  {id:"mars",name:"Mars",distanceAU:1.524,color:"#cf765a"},
  {id:"jupiter",name:"Jupiter",distanceAU:5.203,color:"#c79d7c"},
  {id:"saturn",name:"Saturn",distanceAU:9.537,color:"#d8bf87"},
  {id:"uranus",name:"Uranus",distanceAU:19.191,color:"#8fd9db"},
  {id:"neptune",name:"Neptune",distanceAU:30.069,color:"#5e87d4"}
];

const state = {
  distanceM:20,
  timeS:5,
  name:"",
  speedMps:null,
  step:0,
  planetIndex:2,
  lightRevealed:false,
  lightGuess:null,
  planetLightRevealed:false,
  planetGuess:null,
  raceTimer:null
};
const $ = id => document.getElementById(id);

function formatNumber(value,maxDecimals=1,minDecimals=0){
  return new Intl.NumberFormat("en-US",{
    maximumFractionDigits:maxDecimals,
    minimumFractionDigits:minDecimals
  }).format(value);
}
function formatSpeed(speedMps){
  return formatNumber(speedMps,speedMps>=1000000?0:2,speedMps>=1000000?0:2) + " m/s";
}
function calculateSpeed(distanceM,timeS){
  if(!Number.isFinite(distanceM)||!Number.isFinite(timeS)||distanceM<=0||timeS<=0)return NaN;
  const speed=distanceM/timeS;
  return Number.isFinite(speed)&&speed>0?speed:NaN;
}
function calculateTravelTime(distanceM,speedMps){
  if(!Number.isFinite(distanceM)||!Number.isFinite(speedMps)||distanceM<0||speedMps<=0)return NaN;
  return distanceM/speedMps;
}
function getPlanetDistanceMetres(planet){return planet.distanceAU*AU_METRES}
function plural(value,word){return value===1?word:word+"s"}
function formatTravelDuration(seconds){
  if(!Number.isFinite(seconds)||seconds<0)return "—";
  if(seconds<0.001)return formatNumber(seconds*1000000,2)+" microseconds";
  if(seconds<1)return formatNumber(seconds*1000,1)+" milliseconds";
  if(seconds<60)return formatNumber(seconds,2)+" seconds";
  if(seconds<3600){
    const rounded=Math.round(seconds),minutes=Math.floor(rounded/60),remaining=rounded%60;
    return minutes+" "+plural(minutes,"minute")+(remaining?" "+remaining+" "+plural(remaining,"second"):"");
  }
  if(seconds<86400){
    const minutes=Math.round(seconds/60),hours=Math.floor(minutes/60),remaining=minutes%60;
    return hours+" "+plural(hours,"hour")+(remaining?" "+remaining+" "+plural(remaining,"minute"):"");
  }
  if(seconds<YEAR_SECONDS){
    const hours=Math.round(seconds/3600),days=Math.floor(hours/24),remaining=hours%24;
    return days+" "+plural(days,"day")+(remaining?" "+remaining+" "+plural(remaining,"hour"):"");
  }
  const years=seconds/YEAR_SECONDS;
  if(years<1000)return formatNumber(years,years<10?1:0)+" years";
  if(years<1000000)return formatNumber(years/1000,1)+" thousand years";
  if(years<1000000000)return formatNumber(years/1000000,1)+" million years";
  if(years<1000000000000)return formatNumber(years/1000000000,1)+" billion years";
  return formatNumber(years/1000000000000,1)+" trillion years";
}
function formatFactor(factor){
  if(!Number.isFinite(factor))return "—";
  if(factor>=1000000000)return formatNumber(factor/1000000000,1)+" billion×";
  if(factor>=1000000)return formatNumber(factor/1000000,1)+" million×";
  if(factor>=10000)return formatNumber(factor/1000,1)+" thousand×";
  if(factor>=100)return formatNumber(factor,0)+"×";
  return formatNumber(factor,factor<0.1?3:1)+"×";
}
function getRacers(){
  return RACERS.map(racer=>racer.id==="you"?Object.assign({},racer,{label:state.name||"You",speedMps:state.speedMps}):racer);
}
function makeElement(tag,className,text){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
}

function showError(message,invalidIds){
  $("run-error").textContent=message;
  $("run-error").hidden=false;
  ["distance-input","time-input"].forEach(id=>$(id).setAttribute("aria-invalid",invalidIds.includes(id)?"true":"false"));
}
function clearError(){
  $("run-error").hidden=true;
  ["distance-input","time-input"].forEach(id=>$(id).removeAttribute("aria-invalid"));
}
function readPositiveInput(id){
  const raw=$(id).value.trim();
  if(raw==="")return NaN;
  const number=Number(raw);
  return Number.isFinite(number)&&number>0?number:NaN;
}
function calculateFromForm(){
  const distanceM=readPositiveInput("distance-input");
  const timeS=readPositiveInput("time-input");
  const invalid=[];
  if(!Number.isFinite(distanceM))invalid.push("distance-input");
  if(!Number.isFinite(timeS))invalid.push("time-input");
  if(invalid.length){
    showError("Enter a distance and time greater than zero.",invalid);
    $(invalid[0]).focus();
    return false;
  }
  const speed=calculateSpeed(distanceM,timeS);
  if(!Number.isFinite(speed)){
    showError("Use smaller, measured numbers for the distance and time.",["distance-input","time-input"]);
    return false;
  }
  if(speed>=LIGHT_MPS){
    showError("That would be faster than light. Check the distance and time.",["distance-input","time-input"]);
    return false;
  }
  clearError();
  state.distanceM=distanceM;
  state.timeS=timeS;
  state.name=$("name-input").value.trim().replace(/\s+/g," ").slice(0,32);
  state.speedMps=speed;
  renderRunResult();
  renderComparisons();
  renderPlanetRace();
  return true;
}
function renderRunResult(){
  if(state.speedMps===null)return;
  $("run-placeholder").hidden=true;
  $("run-result").hidden=false;
  $("speed-mps").textContent=formatNumber(state.speedMps,2,2);
  $("speed-kmh").textContent=formatNumber(state.speedMps*3.6,1,1)+" km/h";
  $("runner-label").textContent=state.name?state.name+"'s average speed":"Your average speed";
  $("speed-formula").textContent=formatNumber(state.distanceM,3)+" m ÷ "+formatNumber(state.timeS,3)+" s = "+formatSpeed(state.speedMps);
}
function invalidateRun(){
  state.speedMps=null;
  $("run-placeholder").hidden=false;
  $("run-result").hidden=true;
  clearError();
}

function renderComparisons(){
  if(state.speedMps===null)return;
  const grid=$("racer-grid");
  grid.replaceChildren();
  getRacers().filter(racer=>racer.id!=="light").forEach(racer=>{
    const card=makeElement("article","card racer-card "+racer.id);
    card.append(makeElement("span","racer-emoji",racer.icon));
    card.append(makeElement("h3","",racer.label));
    const speed=makeElement("div","racer-speed",formatNumber(racer.speedMps,2,2));
    speed.append(makeElement("span",""," m/s"));
    card.append(speed);
    card.append(makeElement("p","racer-ratio",racer.id==="you"?"Your measured average":formatFactor(racer.speedMps/state.speedMps)+" your speed"));
    grid.append(card);
  });
  $("light-ratio").textContent="About "+formatFactor(LIGHT_MPS/state.speedMps)+" your average speed.";
  renderLightState();
  renderHundredMetres();
}
function renderLightState(){
  $("light-locked").hidden=state.lightRevealed;
  $("light-unlocked").hidden=!state.lightRevealed;
  $("light-guess-feedback").textContent=state.lightGuess===null?"":state.lightGuess===2?"You got it!":"Good guess!";
  $("light-guesses").replaceChildren();
  ["300 metres","300,000 metres","300 million metres"].forEach((answer,index)=>{
    const button=makeElement("button","guess-option",answer);
    button.type="button";
    button.setAttribute("aria-pressed",String(state.lightGuess===index));
    button.addEventListener("click",()=>{
      state.lightGuess=index;
      Array.from($("light-guesses").children).forEach((option,i)=>option.setAttribute("aria-pressed",String(i===index)));
    });
    $("light-guesses").append(button);
  });
}
function renderHundredMetres(){
  if(state.speedMps===null)return;
  const body=$("hundred-table");
  body.replaceChildren();
  getRacers().filter(racer=>state.lightRevealed||racer.id!=="light").forEach(racer=>{
    const row=makeElement("tr");
    row.append(makeElement("td","",racer.label));
    row.append(makeElement("td","",formatTravelDuration(calculateTravelTime(100,racer.speedMps))));
    body.append(row);
  });
}
function revealLight(){
  if(state.speedMps===null&&!calculateFromForm())return;
  state.lightRevealed=true;
  renderLightState();
  renderHundredMetres();
}

function getPlanetGuessTimes(lightSeconds){
  const choices=[lightSeconds/10,lightSeconds,lightSeconds*10];
  const shift=state.planetIndex%3;
  return choices.map((_,index)=>choices[(index+shift)%3]);
}
function renderPlanetGuesses(lightSeconds){
  const choices=getPlanetGuessTimes(lightSeconds);
  const options=$("planet-guesses");
  options.replaceChildren();
  choices.forEach((seconds,index)=>{
    const button=makeElement("button","guess-option",formatTravelDuration(seconds));
    button.type="button";
    button.setAttribute("aria-pressed",String(state.planetGuess===index));
    button.addEventListener("click",()=>{
      state.planetGuess=index;
      Array.from(options.children).forEach((option,i)=>option.setAttribute("aria-pressed",String(i===index)));
    });
    options.append(button);
  });
}
function revealPlanetLight(){
  if(state.speedMps===null&&!calculateFromForm())return;
  state.planetLightRevealed=true;
  renderPlanetRace();
}

function renderPlanetGrid(){
  const grid=$("planet-grid");
  grid.replaceChildren();
  PLANETS.forEach((planet,index)=>{
    const button=makeElement("button","planet-button");
    button.type="button";
    button.setAttribute("aria-pressed",String(index===state.planetIndex));
    button.setAttribute("aria-label","Race to "+planet.name);
    const icon=makeElement("span","planet-icon "+planet.id);
    icon.setAttribute("aria-hidden","true");
    button.append(icon,makeElement("span","",planet.name));
    button.addEventListener("click",()=>selectPlanet(index));
    grid.append(button);
  });
}
function selectPlanet(index){
  state.planetIndex=index;
  state.planetGuess=null;
  state.planetLightRevealed=false;
  resetRaceAnimation();
  renderPlanetGrid();
  renderPlanetRace();
}
function renderPlanetRace(){
  if(state.speedMps===null)return;
  const planet=PLANETS[state.planetIndex];
  const distanceM=getPlanetDistanceMetres(planet);
  const lightSeconds=calculateTravelTime(distanceM,LIGHT_MPS);
  $("planet-name").textContent=planet.name;
  $("planet-distance").textContent=formatNumber(distanceM/1000000000,1)+" million km";
  $("track-finish").textContent=planet.name;
  $("light-planet-name").textContent=planet.name;
  $("light-travel-time").textContent=formatTravelDuration(lightSeconds);
  $("light-time-callout").hidden=!state.planetLightRevealed;
  $("planet-other-results").hidden=!state.planetLightRevealed;
  $("start-race").hidden=!state.planetLightRevealed;
  $("reveal-planet-light").hidden=state.planetLightRevealed;
  $("planet-guesses").hidden=state.planetLightRevealed;
  renderPlanetGuesses(lightSeconds);
  const correctGuess=getPlanetGuessTimes(lightSeconds)[state.planetGuess]===lightSeconds;
  $("planet-guess-feedback").textContent=state.planetGuess===null?"":correctGuess?" You got it!":" Good guess!";
  const results=$("travel-results");
  results.replaceChildren();
  getRacers().filter(racer=>racer.id!=="light").forEach(racer=>{
    const row=makeElement("div","travel-row");
    row.append(makeElement("strong","",racer.label));
    row.append(makeElement("span","travel-time",formatTravelDuration(calculateTravelTime(distanceM,racer.speedMps))));
    row.append(makeElement("small","",formatFactor(LIGHT_MPS/racer.speedMps)+" longer than light"));
    results.append(row);
  });
}
function resetRaceAnimation(){
  if(state.raceTimer!==null)clearTimeout(state.raceTimer);
  state.raceTimer=null;
  $("race-track").classList.remove("is-running","is-finished");
  $("race-status").textContent="Ready at the Sun.";
}
function startRace(){
  if(state.speedMps===null&&!calculateFromForm())return;
  revealPlanetLight();
  resetRaceAnimation();
  const track=$("race-track");
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){
    track.classList.add("is-finished");
    $("race-status").textContent="Light wins! Compare the times.";
    return;
  }
  void track.offsetWidth;
  track.classList.add("is-running");
  $("race-status").textContent="Watch light cross the Solar System…";
  state.raceTimer=setTimeout(()=>{
    $("race-status").textContent="Light has already arrived!";
    state.raceTimer=setTimeout(()=>{
      track.classList.remove("is-running");
      track.classList.add("is-finished");
      $("race-status").textContent="Light wins! The others have barely started.";
      state.raceTimer=null;
    },4900);
  },1100);
}

function showStep(index){
  if(index<0||index>2)return;
  if(index>0&&state.speedMps===null&&!calculateFromForm()){
    index=0;
  }
  state.step=index;
  if(index!==2&&state.raceTimer!==null)resetRaceAnimation();
  ["step-run","step-compare","step-planets"].forEach((id,i)=>$(id).hidden=i!==index);
  document.querySelectorAll(".step-tab").forEach((button,i)=>{
    const active=i===index;
    button.classList.toggle("is-active",active);
    if(active)button.setAttribute("aria-current","step");
    else button.removeAttribute("aria-current");
  });
  if(index===1)renderComparisons();
  if(index===2)renderPlanetRace();
  window.scrollTo({top:$("main").offsetTop,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
}
function resetAll(){
  resetRaceAnimation();
  $("run-form").reset();
  state.distanceM=20;
  state.timeS=5;
  state.name="";
  state.speedMps=null;
  $("runner-label").textContent="Your average speed";
  state.planetIndex=2;
  state.lightRevealed=false;
  state.lightGuess=null;
  state.planetLightRevealed=false;
  state.planetGuess=null;
  clearError();
  $("run-placeholder").hidden=false;
  $("run-result").hidden=true;
  $("hundred-table").replaceChildren();
  $("travel-results").replaceChildren();
  renderLightState();
  renderPlanetGrid();
  showStep(0);
  $("distance-input").focus();
}
async function togglePresentation(){
  try{
    if(document.fullscreenElement)await document.exitFullscreen();
    else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();
    else $("present-button").title="Use your browser's full screen command.";
  }catch{
    $("present-button").title="Use your browser's full screen command.";
  }
}
function updatePresentButton(){
  const active=!!document.fullscreenElement;
  $("present-button").setAttribute("aria-label",active?"Exit full screen presentation mode":"Enter full screen presentation mode");
  $("present-button").querySelector("span").textContent=active?"Exit":"Present";
}
function init(){
  renderPlanetGrid();
  document.querySelectorAll(".step-tab").forEach(button=>button.addEventListener("click",()=>showStep(Number(button.dataset.step))));
  document.querySelectorAll("[data-go]").forEach(button=>button.addEventListener("click",()=>showStep(Number(button.dataset.go))));
  $("run-form").addEventListener("submit",event=>{event.preventDefault();calculateFromForm()});
  ["distance-input","time-input"].forEach(id=>$(id).addEventListener("input",invalidateRun));
  $("name-input").addEventListener("input",()=>{if(state.speedMps!==null){state.name=$("name-input").value.trim().replace(/\s+/g," ").slice(0,32);renderRunResult();renderComparisons();renderPlanetRace()}});
  $("reset-run").addEventListener("click",resetAll);
  $("start-over").addEventListener("click",resetAll);
  $("reveal-light").addEventListener("click",revealLight);
  $("reveal-planet-light").addEventListener("click",startRace);
  $("start-race").addEventListener("click",startRace);
  $("present-button").addEventListener("click",togglePresentation);
  document.addEventListener("fullscreenchange",updatePresentButton);
}
if(typeof document!=="undefined")document.addEventListener("DOMContentLoaded",init);
if(typeof module!=="undefined")module.exports={LIGHT_MPS,AU_METRES,RACERS,PLANETS,calculateSpeed,calculateTravelTime,getPlanetDistanceMetres,formatSpeed,formatTravelDuration,formatFactor};
