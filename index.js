/**
 * Created by Peter on 22.01.2016.
 */

//---- CONSTANTS ----
const DIRECTION_UP = [87, 38, 73, 104];
const DIRECTION_DOWN = [83, 40, 75, 101];
const DIRECTION_LEFT = [65, 37, 74, 100];
const DIRECTION_RIGHT = [68, 39, 76, 102];
const PLACE_BOMB = [16, 13, 32, 96];

const fps = 60;
const bombDelay = 150;
const explosionTime = 40;


const musicFiles = [
    "Dash Cancel - Nutritious.mp3",
    "Falcon Punch - Benjamin Briggs.mp3",
    "Together, We Fly - Neblix.mp3",
    "Charge! Towards the Sunset of Intergalactic Dictatorship - HeavenWraith.mp3"
];

//--- GAME VARIABLES

var nrOfPlayers = 4;

var prcBoxes = 0.55; // how many percent of the game will be filled with boxes

//powerup spawn probabilities for each broken box (should be <= 1 in total)
var prcSpeed = 0.07;
var prcBombAm = 0.07;
var prcBombPow = 0.07;
var prcRandom = 0.2;


function playerObj() { // player definition
    return {
        x: 1,
        y: 1,
        id: "",
        column: 1,
        line: 1,
        curSpeedX: 0,
        curSpeedY: 0,
        maxSpeed: 1, // will be recalculated onload
        bombCount: 1,
        bombPower: 2,
        placingBombs: false,
        forcePlacingBombs: false,
        walkingDirectionMult: 1, // 1 == forward, -1 == backwards
        alive: false,
        score: 0,
        gamepad: null
    }
}

var p1 = playerObj();
p1.id = "p1";
var p2 = playerObj();
p2.id = "p2";
var p3 = playerObj();
p3.id = "p3";
var p4 = playerObj();
p4.id = "p4";

var playersArr = [];
playersArr.push(p1, p2, p3, p4);

var amountCols, amountLines;
var startBlocks;

//music

var muted = false;
var bpm = 180;
var musicBuffers = [];

//---- ONLOAD VARIABLES ----

// general game related vars
var scoreText, playground, blocks, players, explosions, powerups, menus;
var width, height, blockSize, margin;
var speedLimit;
var loopFunctionId;
var loading, filesToLoad;

// for music
var audioCtx, oscillator, gainNodeOsc, gainNodeMusic;
var deathSound, shortTick, startingSound, music;
var explosionSoundFile = "bomb.wav";
var nowPlaying;
var musicScrollLoopId;

// for fps counter
var fpsFunctionId;
var filterStrength = 15;
var frameTime = 0, lastLoop = new Date, thisLoop;



// ---- HELPER FUNCTIONS ----

function posIsInArr(a, b) { //check if array a is in array of arrays b
    for (var i = 0; i < b.length; i++) {
        if (a[0] == b[i][0] && a[1] == b[i][1]) {
            return true;
        }
    }
    return false;
}

function posIsEqual(pos1, pos2) {
    return (pos1.column == pos2.column && pos1.line == pos2.line);
}

// ---- the rest ----
// -------------------------------------------------------
window.onload = function () { //operations that start after page has been loaded

    menus = document.getElementById("menus");
    playground = document.getElementById("playground");
    blocks = document.getElementById("blocks");
    players = document.getElementById("players");
    explosions = document.getElementById("explosions");
    powerups = document.getElementById("powerups");
    var viewBox = playground.getAttribute("viewBox");
    var viewBoxArr = viewBox.split(" ");
    width = Number(viewBoxArr[2]); //playground.getBoundingClientRect().width not working
    height = Number(viewBoxArr[3]);
    margin = width / 14;

    //music stuff
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    catch (e) {
        alert("Web Audio API not supported, please use the latest version of Chrome or Firefox");
    }

    gainNodeOsc = audioCtx.createGain();
    gainNodeEffects = audioCtx.createGain();
    gainNodeMusic = audioCtx.createGain();

    gainNodeOsc.gain.value = 0.04;
    gainNodeOsc.connect(audioCtx.destination);
    gainNodeEffects.gain.value = 0.08;
    gainNodeEffects.connect(audioCtx.destination);
    gainNodeMusic.gain.value = 0.16;
    gainNodeMusic.connect(audioCtx.destination);
    initSounds();
    playSound(explosionSoundFile);
    music.play();


    assignGamepads();
    displaySplashscreen();

    //load music files
    filesToLoad = musicFiles.length;
    loading = filesToLoad;
    for (var i = 0; i < musicFiles.length; i++) {
        loadMusic(musicFiles[i]);
    }

    window.addEventListener("gamepadconnected", function(e) {
        console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
            e.gamepad.index, e.gamepad.id,
            e.gamepad.buttons.length, e.gamepad.axes.length);
        assignGamepads();
    });

    document.getElementById("settingsIcon").addEventListener("click", settingsListener);
    document.getElementById("soundIcon").addEventListener("click", soundListener);
};

function settingsListener() {
    displayPause();
}

function soundListener() {
    toggleMute();
}

function updateFPSCounter() {
    document.getElementById("fpsText").textContent = "" + (1000/frameTime).toFixed(1);
}

function assignGamepads(){
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
    for (var i = 0; i < gamepads.length; i++) {
        if (gamepads[i] && gamepads[i].id == "Xbox 360 Controller (XInput STANDARD GAMEPAD)" && !gamepads[i].isConnected) {
            for (var j = 0; j < playersArr.length; j++) {
                if (playersArr[j].gamepad === null) {
                    console.log("Controller connected to player %i", j + 1);
                    playersArr[j].gamepad = gamepads[i];
                    gamepads[i].isConnected = true;
                    break;
                }
            }
        }
    }
}

// ---- music ----

function playNote(time, note) { //duration in semiquavers
    var start = time * 1000 * 60 / bpm / 4;
    var stop = start + (note.duration * 1000 * 60 / bpm / 4);

    var oscillator = audioCtx.createOscillator();
    oscillator.connect(gainNodeOsc);

    oscillator.type = note.type;
    oscillator.frequency.value = 440; // value in hertz
    oscillator.detune.value = note.getNoteValue()*100;


    setTimeout(function() {
        oscillator.start();
        console.log(note.note);
    }, start);
    setTimeout(function() {
        oscillator.stop();
    }, stop - 2);
}


function NoteObj(note, dur, type) {
    if (!note) note = 0;
    if (!dur) dur = 4;
    if (!type) type = "sawtooth";
    return {
        note: note,
        duration: dur,
        type: type,
        getNoteValue: function () {
            var retVal = 0;
            var octaveIndex = 1;

            charArr = this.note.split("");
            switch (charArr[0]) {
                case "C":
                    retVal = 0;
                    break;
                case "D":
                    retVal = 2;
                    break;
                case "E":
                    retVal = 4;
                    break;
                case "F":
                    retVal = 5;
                    break;
                case "G":
                    retVal = 7;
                    break;
                case "A":
                    retVal = 9;
                    break;
                case "B":
                    retVal = 10;
                    break;
                case "H":
                    retVal = 11;
                    break;
            }

            switch (charArr[1]) {
                case "i":
                    retVal++;
                    octaveIndex = 3;
                    break;
                case "e":
                    retVal--;
                    octaveIndex = 3;
                    break;
                case "s":
                    retVal--;
                    octaveIndex = 2;
                    break;
            }

            retVal += 12 * (parseInt(this.note.substr(octaveIndex, this.note.length + 1)) - 2);
            return retVal;
        }
    };
}

function SheetObj(timeLength) {
    if (!timeLength) timeLength = 128;
    var retObj = {
        timeLength: timeLength,
        play: function() {
            for (var curTime = 0; curTime <  this.timeLength; curTime++) {
                if (this[curTime]) {
                    for (var i = 0; i < this[curTime].length; i++) {
                        playNote(curTime, this[curTime][i]);
                    }
                }
            }
        }
    };

    for (var curTime = 0; curTime < timeLength; curTime++) {
        retObj[curTime] = [];
    }

    return retObj;
}

function initSounds() {
    //deathSound
    deathSound = SheetObj(9);
    printMelody(deathSound, ["F2", "E2", "Es2", "D2"], 1); //baseline
    printMelody(deathSound, ["E3", "Es3", "D3", "Cis3"], 1); //baseline
    printMelody(deathSound, ["C2", "B2", "As2", "G2"], 1); //baseline
    deathSound[4].push(NoteObj("Cis2", 6));
    deathSound[4].push(NoteObj("C3", 6));
    deathSound[4].push(NoteObj("E2", 6));

    //music
    music = SheetObj(256);
    printMelody(music, ["B-1", "Des0", "F0", "As-1", "Des0", "B-1", "As-1", "F-1"], 16, "square"); //baseline
    printMelody(music, ["B1", "Des2", "As1", "F2", "As1", "F1", "B1", "Des2", "Des2", "B1", "F1", "As1", "Des2", "B1", "F2", "As1"], 8); //melody

    //tick
    shortTick = SheetObj(1);
    shortTick[0].push(NoteObj("Fis3", 1));
    shortTick[0].push(NoteObj("D3", 1));

    //startingSound
    startingSound = SheetObj(1);
    startingSound[0].push(NoteObj("A3", 4));
    startingSound[0].push(NoteObj("D4", 4));
}

function playSound(file) { // tell the source which soundfile to play (as string)
    var request = new XMLHttpRequest();
    var source = audioCtx.createBufferSource();

    request.open('GET', "sounds/" + file, true);
    request.responseType = 'arraybuffer';
    request.onload = function() {
        audioCtx.decodeAudioData(request.response, function(buffer) {
            audioCtx.decodeAudioData(request.response, function(buffer) {
                    source.buffer = buffer;
                    source.connect(gainNodeEffects);
                    source.start(0);
                },
                function(e){
                    console.log("Error with decoding audio data" + e.err);
                }
            );
        }, null);
    };
    request.send();
}

function scrollText(fileName) {
    var text = document.getElementById("musicText").textContent;
    if (text.length > 15 && fileName.length > 23) {
        document.getElementById("musicText").textContent = text.substring(4, text.length);
    }
    else {
        document.getElementById("musicText").textContent = text.substring(4, text.length) + "           " + fileName;
    }
}

function playRandomMusic(exception) { //exception = file not to play
    var rand = Math.floor(Math.random() * musicFiles.length);
    if (musicFiles.length > 1 && (!musicBuffers[rand] || (exception && exception == musicFiles[rand]))) {
        while ((exception == musicFiles[rand] || !musicBuffers[rand])) {
            rand = Math.floor(Math.random() * musicFiles.length);
        }
    }
    playMusic(rand);
}

function loadMusic(file) {
    var request = new XMLHttpRequest();
    if (nowPlaying) {
        clearInterval(musicScrollLoopId);
        nowPlaying.onended = null;
        nowPlaying.stop();
    }
    request.open('GET', "sounds/" + file, true);
    request.responseType = 'arraybuffer';
    request.onload = function() {
        audioCtx.decodeAudioData(request.response, function(buffer) {
                musicBuffers.push(buffer);
                loading--;
            },
            function(e){
                console.log("Error with decoding audio data" + e.err);
            }
        );
    };
    request.send();
}

function playMusic(nr) { // tell the source which soundfile to play (number)
    var source = audioCtx.createBufferSource();
    if (nowPlaying) {
        clearInterval(musicScrollLoopId);
        nowPlaying.onended = null;
        nowPlaying.stop();
    }

    source.buffer = musicBuffers[nr];
    source.connect(gainNodeMusic);
    nowPlaying = source;
    document.getElementById("musicText").textContent = musicFiles[nr].substring(0, musicFiles[nr].length - 4);
    musicScrollLoopId = setInterval(function() {
        scrollText(musicFiles[nr].substring(0, musicFiles[nr].length - 4));
    }, 1000);

    source.start();
    source.onended = function() {
        playRandomMusic(nr);
    };
}

function toggleMute() {
    if (muted) {
        gainNodeOsc.connect(audioCtx.destination);
        gainNodeEffects.connect(audioCtx.destination);
        gainNodeMusic.connect(audioCtx.destination);
        document.getElementById("soundIcon").setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/icons.svg#soundPlayingIcon");
    }
    else {
        gainNodeOsc.disconnect();
        gainNodeEffects.disconnect();
        gainNodeMusic.disconnect();
        document.getElementById("soundIcon").setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/icons.svg#soundMutedIcon");
    }
    muted = !muted;
}

/*
function playMusic(file) { // tell the source which soundfile to play (as string)
    console.log("k", file);
    var request = new XMLHttpRequest();
    var source = audioCtx.createBufferSource();
    if (nowPlaying) {
        clearInterval(musicScrollLoopId);
        nowPlaying.onended = null;
        nowPlaying.stop();
    }
    request.open('GET', "sounds/" + file, true);
    request.responseType = 'arraybuffer';
    request.onload = function() {
        audioCtx.decodeAudioData(request.response, function(buffer) {
                source.buffer = buffer;
                source.connect(gainNodeMusic);
                nowPlaying = source;
                document.getElementById("musicText").textContent = file.substring(0, file.length - 4);
                musicScrollLoopId = setInterval(function() {
                    scrollText( file.substring(0, file.length - 4));
                }, 1000);

                source.start();
                source.onended = function() {
                    playRandomMusic(file);
                }
            },
            function(e){
                console.log("Error with decoding audio data" + e.err);
            }
        );
    };
    request.send();
}*/

function stopMusic() {
    clearInterval(musicScrollLoopId);
    nowPlaying.onended = null;
    nowPlaying.stop();
}


function printMelody(sheet, line, beatLength, soundType, start) {
    if (!soundType) soundType = "sawtooth";
    if (!start) start = 0;
    if (!beatLength) beatLength =  4;
    for (var i = 0; i < line.length; i++) {
        sheet[start + beatLength * i].push(NoteObj(line[i], beatLength, soundType));
    }
}




// --------------------- MAIN GAME LOOP ---------------------
function loop() {
    gamepadControls();
    updatePlayers();
    updateBlocks();


    var thisFrameTime = (thisLoop=new Date) - lastLoop;
    frameTime+= (thisFrameTime - frameTime) / filterStrength;
    lastLoop = thisLoop;
}
// --------------------- MAIN GAME LOOP ---------------------


//---- create element ----

function createElement(parent, href, x, y, width, height, id, line, column, viewbox, type) {
    var elementWrapper = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    var element = document.createElementNS("http://www.w3.org/2000/svg", "use");
    element.setAttributeNS("http://www.w3.org/1999/xlink", "href", href);
    if (x !== null) elementWrapper.setAttribute("x", "" + x);
    if (y !== null) elementWrapper.setAttribute("y", "" + y);
    if (width !== null) elementWrapper.setAttribute("width", "" + width);
    if (height !== null) elementWrapper.setAttribute("height", "" + height);
    if (line !== null) elementWrapper.setAttribute("line", "" + line);
    if (column !== null) elementWrapper.setAttribute("column", "" + column);
    if (viewbox !== null) elementWrapper.setAttribute("viewBox", viewbox);
    if (id !== null) elementWrapper.setAttribute("id", id);
    if (type !== null) elementWrapper.setAttribute("type", type);

    parent.appendChild(elementWrapper);
    elementWrapper.appendChild(element);

    return elementWrapper;
}



// ---- menus ----

function displaySplashscreen() {

    blockWrapper = createElement(menus, "svg/splashscreen.svg#splashscreen", 0, 0, width, height, "splashscreen", null, null, "0 0 700 700");

    blockWrapper.onclick = function() {
        menus.removeChild(document.getElementById("splashscreen"));
        window.onkeydown = null;
        displayMenu();
    };

    window.onkeydown = function() {
        menus.removeChild(document.getElementById("splashscreen"));
        window.onkeydown = null;
        displayMenu();
    };

    /*menus.appendChild(blockWrapper);
    blockWrapper.appendChild(menu);*/
}

function setGameSize(size) {
    amountCols = size;
    amountLines = size;

    startBlocks = [[1, 1], [1, 2], [2, 1], // player 1
    [amountCols - 2, 1], [amountCols - 3, 1], [amountCols - 2, 2], // player 2
    [1, amountLines - 2], [1, amountLines - 3], [2, amountLines - 2], // player 3
    [amountCols - 2, amountLines - 2], [amountCols - 3, amountLines - 2], [amountCols - 2, amountLines - 3]]; // player 4
}

function displayMenu() {

    var blockWrapper = createElement(menus, "svg/mainmenu.svg#background", 0, 0, width, height, "playerselection", null, null, "0 0 700 700");

    /*
    var blockWrapper = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    var menu = document.createElementNS("http://www.w3.org/2000/svg", "use");
    menu.setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/mainmenu.svg#background");
    blockWrapper.setAttribute("viewBox", "0 0 700 700");
    blockWrapper.setAttribute("x", "" + 0);
    blockWrapper.setAttribute("y", "" + 0);
    blockWrapper.setAttribute("width", "" + width);
    blockWrapper.setAttribute("height", "" + height);
    blockWrapper.setAttribute("id", "playerselection");
    menus.appendChild(blockWrapper);
    blockWrapper.appendChild(menu);*/

/*
    menu = document.createElementNS("http://www.w3.org/2000/svg", "use");
    menu.setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/playerselection.svg#svg_players1");
    menu.setAttribute("id", "svg_players1");
    blockWrapper.appendChild(menu);*/

    var menu = document.createElementNS("http://www.w3.org/2000/svg", "use");
    menu.setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/playerselection.svg#svg_players2");
    menu.setAttribute("id", "svg_players2");
    menu.setAttribute("x", "" + 0);
    menu.setAttribute("y", "" + -50);
    blockWrapper.appendChild(menu);

    menu = document.createElementNS("http://www.w3.org/2000/svg", "use");
    menu.setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/playerselection.svg#svg_players3");
    menu.setAttribute("id", "svg_players3");
    menu.setAttribute("x", "" + 0);
    menu.setAttribute("y", "" + -50);
    blockWrapper.appendChild(menu);

    menu = document.createElementNS("http://www.w3.org/2000/svg", "use");
    menu.setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/playerselection.svg#svg_players4");
    menu.setAttribute("id", "svg_players4");
    menu.setAttribute("x", "" + 0);
    menu.setAttribute("y", "" + -50);
    blockWrapper.appendChild(menu);
/*
    document.getElementById("svg_players1").onclick = function() {
        nrOfPlayers = 1;
        setGameSize(7);
        menus.removeChild(document.getElementById("playerselection"));
        startGame();
    };
*/
    document.getElementById("svg_players2").onclick = function() {
        nrOfPlayers = 2;
        setGameSize(15);
        showLoadingScreen();
        startGame();
    };

    document.getElementById("svg_players3").onclick = function() {
        nrOfPlayers = 3;
        setGameSize(17);
        showLoadingScreen();
        startGame();
    };

    document.getElementById("svg_players4").onclick = function() {
        nrOfPlayers = 4;
        setGameSize(19);
        showLoadingScreen();
        startGame();
    };
}

function countdownAndStartLoop(time) {
    window.onkeydown = null;
    window.onkeyup = null;

    var blockWrapper = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    var menu = document.createElementNS("http://www.w3.org/2000/svg", "use");
    menu.setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/countdown.svg#countdownBoard");
    blockWrapper.setAttribute("viewBox", "0 0 160 80");
    blockWrapper.setAttribute("x", "" + (width / 2 - 320 / 2));
    blockWrapper.setAttribute("y", "" + (height / 2 - 320 / 2));
    blockWrapper.setAttribute("width", "" + 320);
    blockWrapper.setAttribute("height", "" + 320);
    blockWrapper.setAttribute("id", "pause");
    menus.appendChild(blockWrapper);
    blockWrapper.appendChild(menu);

    var text = document.createElementNS("http://www.w3.org/2000/svg", "use");
    text.setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/countdown.svg#countdown3");
    blockWrapper.appendChild(text);
    shortTick.play();

    setTimeout(function()  {
        blockWrapper.removeChild(text);
    }, time / 16 * 3);

    setTimeout(function()  {
        text = document.createElementNS("http://www.w3.org/2000/svg", "use");
        text.setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/countdown.svg#countdown2");
        blockWrapper.appendChild(text);
        shortTick.play();
    }, time / 16 * 4);

    setTimeout(function()  {
        blockWrapper.removeChild(text);
    }, time / 16 * 7);

    setTimeout(function()  {
        text = document.createElementNS("http://www.w3.org/2000/svg", "use");
        text.setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/countdown.svg#countdown1");
        blockWrapper.appendChild(text);
        shortTick.play();
    }, time / 16 * 8);

    setTimeout(function()  {
        blockWrapper.removeChild(text);
    }, time / 16 * 11);

    setTimeout(function()  {
        text = document.createElementNS("http://www.w3.org/2000/svg", "use");
        text.setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/countdown.svg#countdownGo");
        blockWrapper.appendChild(text);
        startingSound.play();
    }, time / 16 * 12);

    setTimeout(function()  {
        window.onkeydown = gameControlsDown;
        window.onkeyup = gameControlsUp;
        menus.removeChild(blockWrapper);
        loopFunctionId = setInterval(loop, 1000 / fps);
        fpsFunctionId = setInterval(function(){
            updateFPSCounter();
        },1000);
        document.getElementById("settingsIcon").addEventListener("click", settingsListener);
    }, time);
}

function showLoadingScreen() {
    createElement(menus, "svg/mainmenu.svg#background", 0, 0, width, height, "loadingScreen", null, null, "0 0 700 700");
    var progress = document.createElement("progress");
    progress.setAttribute("id", "loadingProgress");
    progress.setAttribute("x", "0");
    progress.setAttribute("y", "0");
    progress.setAttribute("max", "1.0");
    progress.setAttribute("value", "0.0");
    document.body.insertBefore(progress, document.body.firstChild);
}

function updateLoadingScreen() {
    var prgElem = document.getElementById("loadingProgress");
    var curVal = Number(prgElem.getAttribute("value"));
    if (curVal < (1 - (loading - 1) / filesToLoad)) {
        prgElem.setAttribute("value", curVal + 0.05);
    }
}


function startGame() {
    if (loading > 0) {
        updateLoadingScreen();
        setTimeout(function() {
            startGame();
        }, 100);
        return;
    }

    document.getElementById("loadingProgress").setAttribute("value", 1 - loading / 4);
    menus.removeChild(document.getElementById("playerselection"));
    menus.removeChild(document.getElementById("loadingScreen"));
    document.body.removeChild(document.getElementById("loadingProgress"));
    initGame();
    playRandomMusic();
    countdownAndStartLoop(3000);
}

// -------------------------------------------------------
function getGridCoords(x, y) { // returns object with coordinates of the game's grid
    var pos = Object.create(null);
    pos.column = Math.round((x - margin) / (blockSize + ((width - margin*2) - amountCols * blockSize) / (amountCols )));
    pos.line = Math.round((y - margin) / (blockSize +  ((width - margin*2) - amountLines * blockSize) / (amountLines)));
    return pos;
}

// -------------------------------------------------------
function getBlock(pos) { // returns block at grid coordinates, null if none found
    var blocksArr = blocks.children;
    for (var i = 0; i < blocksArr.length; i++) {
        if (blocksArr[i].getAttribute("column") == pos.column && blocksArr[i].getAttribute("line") == pos.line) {
            return blocksArr[i];
        }
    }
    return null;
}

function getExplosions(pos) { // returns explosions at grid coordinates, null if none found
    var explArr = explosions.children;
    var retArr = [];
    for (var i = 0; i < explArr.length; i++) {
        if (explArr[i].getAttribute("column") == pos.column && explArr[i].getAttribute("line") == pos.line) {
            retArr.push(explArr[i]);
        }
    }
    return retArr;
}

// -------------------------------------------------------
function getPowerup(pos) { // returns powerup at grid coordinates, null if none found
    var pwrupArr = powerups.children;
    for (var i = 0; i < pwrupArr.length; i++) {
        if (pwrupArr[i].getAttribute("column") == pos.column && pwrupArr[i].getAttribute("line") == pos.line) {
            return pwrupArr[i];
        }
    }
    return null;
}

// -------------------------------------------------------
function getCSSCoords(x, y) {
    return {x: margin + x * (blockSize), y: margin + y * (blockSize)};
}

function calculateDir(player) {
    var x = ((player.curSpeedX / Math.abs(player.curSpeedX))) * 4; // x: -4, 0 or 4
    var y = (player.curSpeedY / Math.abs(player.curSpeedY)); // y: -1, 0 or 1
    x = x ? x : 0;
    y = y ? y : 0;
    switch(x+y) {
        case 1: return "180deg";
        case -3: return "-135deg";
        case -4: return "-90deg";
        case -5: return "-45deg";
        case -1: return "0deg";
        case 3: return "45deg";
        case 4: return "90deg";
        case 5: return "135deg";
        default: return null;
    }
}

function adjustPlayerHeading(player) { //changes players use element to the current heading when he is moving
    var heading = calculateDir(player);
    if (heading) {
        document.getElementById(player.id).children[0].setAttribute("style", "transform: rotate(" + heading + "); " +
            "-webkit-transform: rotate(" + heading + "); -moz-transform: rotate(" + heading + ");");
    }
}

function pauseControls(e) { //controls during pause
    var key = e.keyCode ? e.keyCode : e.which;

    if (key == 27) {
        menus.removeChild(document.getElementById("pause"));
        countdownAndStartLoop(3000);
        setTimeout(function(){
            window.onkeydown = gameControlsDown;
            window.onkeyup = gameControlsUp;
        }, 4000);
    }
}

function displayPause() {
    document.getElementById("settingsIcon").removeEventListener("click", settingsListener);
    window.onkeydown = pauseControls;
    window.onkeyup = null;
    clearInterval(loopFunctionId);

    var pauseWrapper = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    pauseWrapper.setAttribute("viewBox", "0 0 320 180");
    pauseWrapper.setAttribute("x", "" + (width / 2 - 320 / 2));
    pauseWrapper.setAttribute("y", "" + (height / 2 - 180 / 2));
    pauseWrapper.setAttribute("width", "" + 320);
    pauseWrapper.setAttribute("height", "" + 180);
    pauseWrapper.setAttribute("id", "pause");

    var element = document.createElementNS("http://www.w3.org/2000/svg", "use");
    element.setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/pause.svg#pause");
    pauseWrapper.appendChild(element);

    element = document.createElementNS("http://www.w3.org/2000/svg", "use");
    element.setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/pause.svg#continueSign");
    element.onclick = function() {
        menus.removeChild(document.getElementById("pause"));
        countdownAndStartLoop(3000);
        setTimeout(function(){
            window.onkeydown = gameControlsDown;
            window.onkeyup = gameControlsUp;
        }, 4000);
    };
    pauseWrapper.appendChild(element);

    element = document.createElementNS("http://www.w3.org/2000/svg", "use");
    element.setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/pause.svg#backToMenuSign");
    element.onclick = function() {
        resetAllBlocks();
        resetPlayers();
        resetScores();
        displaySplashscreen();
        stopMusic();
        clearInterval(fpsFunctionId);
    };
    pauseWrapper.appendChild(element);

    menus.appendChild(pauseWrapper);
}

//--------------------------------------------------------------------------
function gameControlsDown(e) {
    var key = e.keyCode ? e.keyCode : e.which;
    var player;
    if (key == 27) {
       displayPause();
    }

    var arrowKeys = [32, 37, 38, 39, 40];

    if (arrowKeys.indexOf(key) >= 0) {
        e.preventDefault();
    }

    for (var i = 1; i <= 4; i++) {
        player = playersArr[i-1];

        if (player.alive) {
            if (key === PLACE_BOMB[i-1]) {
                player.placingBombs = true;
            } else if (key === DIRECTION_UP[i-1]) {
                player.curSpeedY = -player.maxSpeed * player.walkingDirectionMult;
                adjustPlayerHeading(player);
            } else if (key === DIRECTION_DOWN[i-1]) {
                player.curSpeedY = +player.maxSpeed * player.walkingDirectionMult;
                adjustPlayerHeading(player);
            } else if (key === DIRECTION_LEFT[i-1]) {
                player.curSpeedX = -player.maxSpeed * player.walkingDirectionMult;
                adjustPlayerHeading(player);
            } else if (key === DIRECTION_RIGHT[i-1]) {
                player.curSpeedX = +player.maxSpeed * player.walkingDirectionMult;
                adjustPlayerHeading(player);
            }
        }
    }
}

// -------------------------------------------------------
function gameControlsUp(e) { // implement keystate?
    var key = e.keyCode ? e.keyCode : e.which;
    var player;
    for (var i = 1; i <= 4; i++) {
        player = playersArr[i - 1];
        if (player.alive) {
            if (key === PLACE_BOMB[i-1] || key === 16) {
                player.placingBombs = player.forcePlacingBombs;
            } else if (key === DIRECTION_UP[i-1] && player.maxSpeed * player.walkingDirectionMult * player.curSpeedY < 0) {
                player.curSpeedY = 0;
                adjustPlayerHeading(player);
            } else if (key === DIRECTION_DOWN[i-1] && player.maxSpeed * player.walkingDirectionMult * player.curSpeedY > 0) {
                player.curSpeedY = 0;
                adjustPlayerHeading(player);
            } else if (key === (DIRECTION_LEFT[i-1]) && player.maxSpeed * player.walkingDirectionMult * player.curSpeedX < 0) {
                player.curSpeedX = 0;
                adjustPlayerHeading(player);
            } else if (key === DIRECTION_RIGHT[i-1] && player.maxSpeed * player.walkingDirectionMult * player.curSpeedX > 0) {
                player.curSpeedX = 0;
                adjustPlayerHeading(player);
            }
        }
    }
}

function gamepadControls() {
    assignGamepads();
    for (var i = 0; i < nrOfPlayers; i++) {
        var player = playersArr[i];
        if (player.gamepad) {
            var controller = player.gamepad;

            //buttons
            /* all buttons
            for (i = 0; i < controller.buttons.length; i++) {
                var val = controller.buttons[i];
                var pressed = val == 1.0;
                if (typeof(val) == "object") {
                    pressed = val.pressed;
                    val = val.value;
                }
                if (pressed) {
                    console.log(i, val, pressed);
                }
            } */


            player.placingBombs = controller.buttons[0].pressed || player.forcePlacingBombs;

            //sticks
            for (var j = 0; j < controller.axes.length; j++) {
                player.curSpeedX = controller.axes[0] * player.maxSpeed * player.walkingDirectionMult;
                player.curSpeedY = controller.axes[1] * player.maxSpeed * player.walkingDirectionMult;

                if (Math.abs(controller.axes[0]) < 0.20) {
                    player.curSpeedX = 0;
                }
                else { //diagonal max speed is 0.7 in x and y direction, adjusting for that
                    var dirX = player.curSpeedX / Math.abs(player.curSpeedX);
                    player.curSpeedX += 0.3 * dirX;
                    if (Math.abs(player.curSpeedX) > player.maxSpeed) {
                        player.curSpeedX = player.maxSpeed * dirX;
                    }
                }

                if (Math.abs(controller.axes[1]) < 0.20) {
                    player.curSpeedY = 0;
                }
                else {
                    var dirY = player.curSpeedY / Math.abs(player.curSpeedY);
                    player.curSpeedY += 0.3 * dirY;
                    if (Math.abs(player.curSpeedY) > player.maxSpeed) {
                        player.curSpeedY = player.maxSpeed * dirY;
                    }
                }

                adjustPlayerHeading(player);
            }
        }

    }
}

function startNewRound(){
    resetPlayers();
    resetAllBlocks();
    initGame();
    countdownAndStartLoop(3000);
}

function resetPlayers() {
    for (var i = 0; i < 4; i++) {
        playersArr[i].curSpeedX = 0;
        playersArr[i].curSpeedY = 0;
        playersArr[i].bombCount = 1;
        playersArr[i].bombPower = 2;
        playersArr[i].forcePlacingBombs = false;
        playersArr[i].placingBombs = false;
    }
}

function resetAllBlocks() {
    var nodes = blocks;
    while (nodes.firstChild) {
        nodes.removeChild(nodes.firstChild);
    }
    nodes = players;
    while (nodes.firstChild) {

        nodes.removeChild(nodes.firstChild);
    }

    nodes = explosions;
    while (nodes.firstChild) {
        nodes.removeChild(nodes.firstChild);
    }

    nodes = powerups;
    while (nodes.firstChild) {
        nodes.removeChild(nodes.firstChild);
    }

    nodes = menus;
    while (nodes.firstChild) {
        nodes.removeChild(nodes.firstChild);
    }
}

function resetScores() {
    for (var i = 0; i < 4; i++) {
        playersArr[i].score = 0;
        document.getElementById("score" + (i + 1)).textContent = "";
    }
}

// -------------------------------------------------------
function initGame() {
    var pos, block, blockWrapper;
    blockSize = (width - 2 * margin) / (amountCols);
    speedLimit = blockSize / 9;
    for (var line = 0; line < amountLines; line++) {
        for (var column = 0; column < amountCols; column++) {
            if ((column == 0 || line == 0 || column == amountCols - 1 || line == amountLines - 1) ||
                (line % 2 == 0 && column % 2 == 0)) {
                pos = getCSSCoords(column, line);
                blockWrapper = createElement(blocks, "svg/stone.svg#stone", pos.x, pos.y, blockSize, blockSize, null, line, column, "0 0 37 37", "stone");
            }
            else if (!posIsInArr([column, line], startBlocks) && Math.random() < prcBoxes) {
                pos = getCSSCoords(column, line);
                blockWrapper = createElement(blocks, "svg/box.svg#box", pos.x, pos.y, blockSize, blockSize, null, line, column, "0 0 37 37", "box");
            }
            else if (line == 1 && column == 1) { //player 1
                pos = getCSSCoords(column, line);
                blockWrapper = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                block = document.createElementNS("http://www.w3.org/2000/svg", "use");
                block.setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/player.svg#p1");
                block.setAttribute("class", "pUse");
                block.setAttribute("style", "transform: rotate(180deg); " +
                    "-webkit-transform: rotate(180deg); -moz-transform: rotate(180deg);");
                blockWrapper.setAttribute("id", "p1");
                blockWrapper.setAttribute("x", "" + pos.x);
                blockWrapper.setAttribute("y", "" + pos.y);
                blockWrapper.setAttribute("viewBox", "5 5 32 32");
                blockWrapper.setAttribute("width", "" + blockSize);
                blockWrapper.setAttribute("height", "" + blockSize);
                blockWrapper.setAttribute("type", "player");
                players.appendChild(blockWrapper);
                blockWrapper.appendChild(block);


                p1.x = pos.x;
                p1.y = pos.y;
                p1.maxSpeed = blockSize / 24;
                p1.column = 1;
                p1.line = 1;
                p1.alive = true;
            }
            else if (nrOfPlayers >= 2 && line == amountLines - 2 && column == amountCols - 2) { //player 2
                pos = getCSSCoords(column, line);
                blockWrapper = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                block = document.createElementNS("http://www.w3.org/2000/svg", "use");
                block.setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/player.svg#p2");
                block.setAttribute("class", "pUse");
                blockWrapper.setAttribute("id", "p2");
                blockWrapper.setAttribute("x", "" + pos.x);
                blockWrapper.setAttribute("y", "" + pos.y);
                blockWrapper.setAttribute("viewBox", "5 5 32 32");
                blockWrapper.setAttribute("width", "" + blockSize);
                blockWrapper.setAttribute("height", "" + blockSize);
                blockWrapper.setAttribute("type", "player");
                players.appendChild(blockWrapper);
                blockWrapper.appendChild(block);

                p2.x = pos.x;
                p2.y = pos.y;
                p2.maxSpeed = blockSize / 24;
                p2.column = amountLines - 2;
                p2.line = amountCols - 2;
                p2.alive = true;
            }
            else if (nrOfPlayers >= 3 && line == 1 && column == amountCols - 2) { //player 3
                pos = getCSSCoords(column, line);
                blockWrapper = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                block = document.createElementNS("http://www.w3.org/2000/svg", "use");
                block.setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/player.svg#p3");
                block.setAttribute("class", "pUse");
                block.setAttribute("style", "transform: rotate(-90deg); " +
                    "-webkit-transform: rotate(-90deg); -moz-transform: rotate(-90deg);");
                blockWrapper.setAttribute("id", "p3");
                blockWrapper.setAttribute("x", "" + pos.x);
                blockWrapper.setAttribute("y", "" + pos.y);
                blockWrapper.setAttribute("viewBox", "5 5 32 32");
                blockWrapper.setAttribute("width", "" + blockSize);
                blockWrapper.setAttribute("height", "" + blockSize);
                blockWrapper.setAttribute("type", "player");
                players.appendChild(blockWrapper);
                blockWrapper.appendChild(block);

                p3.x = pos.x;
                p3.y = pos.y;
                p3.maxSpeed = blockSize / 24;
                p3.column = amountLines - 2;
                p3.line = amountCols - 2;
                p3.alive = true;
            }
            else if (nrOfPlayers >= 4 && line == amountLines - 2 && column == 1) { //player 4
                pos = getCSSCoords(column, line);
                blockWrapper = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                block = document.createElementNS("http://www.w3.org/2000/svg", "use");
                block.setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/player.svg#p4");
                block.setAttribute("class", "pUse");
                block.setAttribute("style", "transform: rotate(90deg); " +
                    "-webkit-transform: rotate(90deg); -moz-transform: rotate(90deg);");
                blockWrapper.setAttribute("id", "p4");
                blockWrapper.setAttribute("x", "" + pos.x);
                blockWrapper.setAttribute("y", "" + pos.y);
                blockWrapper.setAttribute("viewBox", "5 5 32 32");
                blockWrapper.setAttribute("width", "" + blockSize);
                blockWrapper.setAttribute("height", "" + blockSize);
                blockWrapper.setAttribute("type", "player");
                players.appendChild(blockWrapper);
                blockWrapper.appendChild(block);

                p4.x = pos.x;
                p4.y = pos.y;
                p4.maxSpeed = blockSize / 24;
                p4.column = amountLines - 2;
                p4.line = amountCols - 2;
                p4.alive = true;
            }
        }
    }

    for (var j = 0; j < nrOfPlayers; j++) {
        document.getElementById("score" + (j + 1)).textContent = "" + playersArr[j].score;
    }
}


// -------------------------------------------------------
function updatePlayers() {
    var player, playersAlive = 0;
    for (var i = 0; i < nrOfPlayers; i++) {
        if (playersArr[i].alive) {
            playersAlive++;
            player = playersArr[i];
        }
        else {
            continue;
        }

        var curPos = {column: player.column, line: player.line};
        var nextPosX = getGridCoords(player.x + player.curSpeedX, player.y);
        var curBlock = getBlock(curPos);

        if ((curBlock !== null && posIsEqual(curPos, nextPosX)) || getBlock(nextPosX) === null) {
            player.x += player.curSpeedX;
        }

        var nextPosY = getGridCoords(player.x, player.y + player.curSpeedY);
        if ((curBlock !== null && posIsEqual(curPos, nextPosY))|| getBlock(nextPosY) === null) {
            player.y += player.curSpeedY;
        }

        var newPos = getGridCoords(player.x, player.y);
        player.column = newPos.column;
        player.line = newPos.line;

        var localExplosion = checkForExplosion(player);
        if (localExplosion !== null) {
            killPlayer(player);
            for (var j = 0; j < nrOfPlayers; j++) {
                var owner = localExplosion.getAttribute("owner");
                if (playersArr[j].id == owner) {
                    if (player.id == owner) {
                        playersArr[j].score--;
                        document.getElementById("score" + (j + 1)).textContent = playersArr[j].score;
                    }
                    else {
                        playersArr[j].score += 3;
                        document.getElementById("score" + (j + 1)).textContent = playersArr[j].score;
                    }
                }
            }
        }
        if (player.placingBombs) {
            placeBomb(player);
        }
        pickupPowerup(player);

        if (player.alive) {
            //document.getElementById(player.id).setAttribute("style", "top: " + player.y + "px; left: " + player.x + "px;");
            document.getElementById(player.id).setAttribute("x", "" + player.x);
            document.getElementById(player.id).setAttribute("y", "" + player.y);
        }
    }
    if (nrOfPlayers > 1 && playersAlive <= 1) {
        clearInterval(loopFunctionId);
        setTimeout(startNewRound, 2000);
    }
}

// -------------------------------------------------------
function checkForExplosion(player) {
    var explArr = explosions.children;
    for (var i = 0; i < explArr.length; i++) {
        if (explArr[i].getAttribute("column") == player.column &&
            explArr[i].getAttribute("line") == player.line) {
            return explArr[i];
        }
    }
    return null;
}

// -------------------------------------------------------
function killPlayer(player) {
    console.log(player.id, "died!");
    deathSound.play();
    player.maxSpeed = 0;
    player.x = -1000;
    player.y = -1000;
    player.column = -10;
    player.line = -10;
    player.alive = false;

    players.removeChild(document.getElementById(player.id));
}

// -------------------------------------------------------
function placeBomb(player) {
    if (player.bombCount > 0 && getBlock(player) === null) {
        player.bombCount--;
        var blockWrapper = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        var block = document.createElementNS("http://www.w3.org/2000/svg", "use");
        block.setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/bomb.svg#bomb1");

        var bombPos = getCSSCoords(player.column, player.line);
        blockWrapper.setAttribute("x", "" + bombPos.x);
        blockWrapper.setAttribute("y", "" + bombPos.y);
        blockWrapper.setAttribute("line", "" + player.line);
        blockWrapper.setAttribute("column", "" + player.column);
        blockWrapper.setAttribute("ticker", "" + bombDelay);
        blockWrapper.setAttribute("power", "" + player.bombPower);
        blockWrapper.setAttribute("owner", "" + player.id);
        blockWrapper.setAttribute("viewBox", "0 0 37 37");
        blockWrapper.setAttribute("width", "" + blockSize);
        blockWrapper.setAttribute("height", "" + blockSize);
        blockWrapper.setAttribute("type", "bomb");
        blocks.appendChild(blockWrapper);
        blockWrapper.appendChild(block);
    }
}

// -------------------------------------------------------
function updateBlocks() {
    var blocksArr = blocks.children;
    var block, newTicker, explNr;
    for (var i = 0; i < blocksArr.length; i++) {
        block = blocksArr[i];
        if (block.getAttribute("type") == "bomb") {
            newTicker = block.getAttribute("ticker") - 1;
            block.setAttribute("ticker", "" + (newTicker));

            explNr = 3 - + Math.floor(3 * (Number(newTicker) / bombDelay));
            block.children[0].setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/bomb.svg#bomb" + explNr);

            if (newTicker <= 0) {
                explode(block);
            }
        }
    }

    var explArr = explosions.children;
    for (i = 0; i < explArr.length; i++) {
        block = explArr[i];
        newTicker = block.getAttribute("ticker") - 1;
        block.setAttribute("ticker", "" + (newTicker));
        explNr = 1 + Math.floor(12 * (Number(newTicker) / explosionTime));
        block.children[0].setAttributeNS("http://www.w3.org/1999/xlink", "href", "#explosion");

        if (newTicker <= 0) {
            if (block.getAttribute("brokeBox") == "true") {
                spawnPowerup(block);
            }
            explosions.removeChild(block);
        }
    }
}

// -------------------------------------------------------
function getNewExpl(x, y, column, line, owner) {
    var expl = document.createElementNS("http://www.w3.org/2000/svg", "use");
    var blockWrapper = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    expl.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#explosion1");
    var pos = getCSSCoords(column, line);
    blockWrapper.setAttribute("x", "" + pos.x);
    blockWrapper.setAttribute("y", "" + pos.y);
    blockWrapper.setAttribute("column", "" + column);
    blockWrapper.setAttribute("line", "" + line);
    blockWrapper.setAttribute("viewBox", "0 0 37 37");
    blockWrapper.setAttribute("width", "" + blockSize);
    blockWrapper.setAttribute("height", "" + blockSize);
    blockWrapper.setAttribute("ticker", "" + explosionTime);
    blockWrapper.setAttribute("owner", "" + owner);
    blockWrapper.setAttribute("brokeBox", "false");
    blockWrapper.setAttribute("type", "explosion");
    blockWrapper.appendChild(expl);
    return blockWrapper;
}

// -------------------------------------------------------
function explode(bomb) {
    playSound(explosionSoundFile); //play sound
    //remove bomb from game before explosion
    blocks.removeChild(bomb);
    var bombX = Number(bomb.getAttribute("x"));
    var bombY = Number(bomb.getAttribute("y"));
    var bombCol = Number(bomb.getAttribute("column"));
    var bombLine = Number(bomb.getAttribute("line"));
    var owner = bomb.getAttribute("owner");

    var expl = getNewExpl(bombX, bombY, bombCol, bombLine, owner);
    explosions.appendChild(expl);
    var nextBlock, nextPowerup, nextExpl;
    var hasBrokenBox;

    //give player a bomb back
    for (var j = 0; j < 4; j++) {
        if (playersArr[j].id == bomb.getAttribute("owner")) {
            playersArr[j].bombCount++;
            break;
        }
    }

    // explode up
    for (var i = 1; i < bomb.getAttribute("power"); i++) {
        nextExplosion =
        nextBlock = getBlock({column: bombCol, line: bombLine - i});
        nextExpl = getExplosions({column: bombCol, line: bombLine - i});
        if (nextExpl !== null) { //check if box has already been broken here
            hasBrokenBox = false;
            for (var k = 0; k < nextExpl.length; k++) {
                if (nextExpl[k].getAttribute("brokeBox") == "true") {
                    hasBrokenBox = true;
                    break;
                }
            }
            if (hasBrokenBox){
                break;
            }
        }
        if (nextBlock === null) {
            nextPowerup = getPowerup({column: bombCol, line: bombLine - i});
            if (nextPowerup !== null) {
                powerups.removeChild(nextPowerup);
            }
            expl = getNewExpl(bombX, bombY - blockSize * i, bombCol, bombLine - i, owner);
            explosions.appendChild(expl);
        }
        else if (nextBlock.getAttribute("type") == "box") {
            expl = getNewExpl(bombX, bombY - blockSize * i, bombCol, bombLine - i, owner);
            expl.setAttribute("brokeBox", "true");
            explosions.appendChild(expl);
            breakBox(nextBlock);
            break;
        }
        else if (nextBlock.getAttribute("type") == "bomb") {
            explode(nextBlock);
        }
        else {
            break;
        }
    }

    //explode down
    for (i = 1; i < bomb.getAttribute("power"); i++) {
        nextBlock = getBlock({column: bombCol, line: bombLine + i});
        nextExpl = getExplosions({column: bombCol, line: bombLine + i});
        if (nextExpl !== null) { //check if box has already been broken here
            hasBrokenBox = false;
            for (k = 0; k < nextExpl.length; k++) {
                if (nextExpl[k].getAttribute("brokeBox") == "true") {
                    hasBrokenBox = true;
                    break;
                }
            }
            if (hasBrokenBox){
                break;
            }
        }
        if (nextBlock === null) {
            nextPowerup = getPowerup({column: bombCol, line: bombLine + i});
            if (nextPowerup !== null) {
                powerups.removeChild(nextPowerup);
            }
            expl = getNewExpl(bombX, bombY + blockSize * i, bombCol, bombLine + i, owner);
            explosions.appendChild(expl);
        }
        else if (nextBlock.getAttribute("type") == "box") {
            expl = getNewExpl(bombX, bombY + blockSize * i, bombCol, bombLine + i, owner);
            expl.setAttribute("brokeBox", "true");
            explosions.appendChild(expl);
            breakBox(nextBlock);
            break;
        }
        else if (nextBlock.getAttribute("type") == "bomb") {
            explode(nextBlock);
        }
        else {
            break;
        }
    }

    //explode right
    for (i = 1; i < bomb.getAttribute("power"); i++) {
        nextBlock = getBlock({column: bombCol + i, line: bombLine});
        nextExpl = getExplosions({column: bombCol + i, line: bombLine});
        if (nextExpl !== null) { //check if box has already been broken here
            hasBrokenBox = false;
            for (k = 0; k < nextExpl.length; k++) {
                if (nextExpl[k].getAttribute("brokeBox") == "true") {
                    hasBrokenBox = true;
                    break;
                }
            }
            if (hasBrokenBox){
                break;
            }
        }
        if (nextBlock === null) {
            nextPowerup = getPowerup({column: bombCol + i, line: bombLine});
            if (nextPowerup !== null) {
                powerups.removeChild(nextPowerup);
            }
            expl = getNewExpl(bombX + blockSize * i, bombY, bombCol + i, bombLine, owner);
            explosions.appendChild(expl);
        }
        else if (nextBlock.getAttribute("type") == "box") {
            expl = getNewExpl(bombX + blockSize * i, bombY, bombCol + i, bombLine, owner);
            expl.setAttribute("brokeBox", "true");
            explosions.appendChild(expl);
            breakBox(nextBlock);
            break;
        }
        else if (nextBlock.getAttribute("type") == "bomb") {
            explode(nextBlock);
        }
        else {
            break;
        }
    }

    //explode left
    for (i = 1; i < bomb.getAttribute("power"); i++) {
        nextBlock = getBlock({column: bombCol - i, line: bombLine});
        nextExpl = getExplosions({column: bombCol - i, line: bombLine});
        if (nextExpl !== null) { //check if box has already been broken here
            hasBrokenBox = false;
            for (k = 0; k < nextExpl.length; k++) {
                if (nextExpl[k].getAttribute("brokeBox") == "true") {
                    hasBrokenBox = true;
                    break;
                }
            }
            if (hasBrokenBox){
                break;
            }
        }
        if (nextBlock === null) {
            nextPowerup = getPowerup({column: bombCol - i, line: bombLine});
            if (nextPowerup !== null) {
                powerups.removeChild(nextPowerup);
            }
            expl = getNewExpl(bombX - blockSize * i, bombY, bombCol - i, bombLine, owner);
            explosions.appendChild(expl);
        }
        else if (nextBlock.getAttribute("type") == "box") {
            expl = getNewExpl(bombX - blockSize * i, bombY, bombCol - i, bombLine, owner);
            expl.setAttribute("brokeBox", "true");
            explosions.appendChild(expl);
            breakBox(nextBlock);
            break;
        }
        else if (nextBlock.getAttribute("type") == "bomb") {
            explode(nextBlock);
        }
        else {

            break;
        }
    }

}

// -------------------------------------------------------
function breakBox(block) {
    blocks.removeChild(block);
}

function spawnPowerup(block) {
    var powerup, blockWrapper;
    var rand = Math.random();
    if (rand < prcBombAm) {
        powerup = document.createElementNS("http://www.w3.org/2000/svg", "use");
        blockWrapper = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        powerup.setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/powerup.svg#powerupBomb");
        blockWrapper.setAttribute("viewBox", "0 0 100 100");
        blockWrapper.setAttribute("x", "" + block.getAttribute("x"));
        blockWrapper.setAttribute("y", "" + block.getAttribute("y"));
        blockWrapper.setAttribute("column", "" + block.getAttribute("column"));
        blockWrapper.setAttribute("line", "" + block.getAttribute("line"));
        blockWrapper.setAttribute("width", "" + blockSize);
        blockWrapper.setAttribute("height", "" + blockSize);
        blockWrapper.setAttribute("type", "powerupAmount");
        powerups.appendChild(blockWrapper);
        blockWrapper.appendChild(powerup);
    }
    else if (rand < prcBombAm + prcSpeed) {
        powerup = document.createElementNS("http://www.w3.org/2000/svg", "use");
        blockWrapper = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        powerup.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#powerupSpeed");
        blockWrapper.setAttribute("x", "" + block.getAttribute("x"));
        blockWrapper.setAttribute("y", "" + block.getAttribute("y"));
        blockWrapper.setAttribute("column", "" + block.getAttribute("column"));
        blockWrapper.setAttribute("line", "" + block.getAttribute("line"));
        powerup.setAttribute("width", "" + blockSize);
        powerup.setAttribute("height", "" + blockSize);
        blockWrapper.setAttribute("type", "powerupSpeed");
        powerups.appendChild(blockWrapper);
        blockWrapper.appendChild(powerup);
    }
    else if (rand < prcBombAm + prcSpeed + prcBombPow) {
        powerup = document.createElementNS("http://www.w3.org/2000/svg", "use");
        blockWrapper = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        powerup.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#powerupPower");
        blockWrapper.setAttribute("x", "" + block.getAttribute("x"));
        blockWrapper.setAttribute("y", "" + block.getAttribute("y"));
        blockWrapper.setAttribute("column", "" + block.getAttribute("column"));
        blockWrapper.setAttribute("line", "" + block.getAttribute("line"));
        powerup.setAttribute("width", "" + blockSize);
        powerup.setAttribute("height", "" + blockSize);
        blockWrapper.setAttribute("type", "powerupPower");
        powerups.appendChild(blockWrapper);
        blockWrapper.appendChild(powerup);
    }
    else if (rand < prcBombAm + prcSpeed + prcBombPow + prcRandom) {
        powerup = document.createElementNS("http://www.w3.org/2000/svg", "use");
        blockWrapper = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        powerup.setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/powerup.svg#powerupRandom");
        blockWrapper.setAttribute("viewBox", "0 0 100 100");
        blockWrapper.setAttribute("x", "" + block.getAttribute("x"));
        blockWrapper.setAttribute("y", "" + block.getAttribute("y"));
        blockWrapper.setAttribute("column", "" + block.getAttribute("column"));
        blockWrapper.setAttribute("line", "" + block.getAttribute("line"));
        blockWrapper.setAttribute("width", "" + blockSize);
        blockWrapper.setAttribute("height", "" + blockSize);
        blockWrapper.setAttribute("type", "powerupRandom");
        powerups.appendChild(blockWrapper);
        blockWrapper.appendChild(powerup);
    }
}

function pickupPowerup(player) {
    var powerup = getPowerup(player);
    if (powerup !== null) {
        if (powerup.getAttribute("type") == "powerupAmount") {
            player.bombCount++;
        }
        else if (powerup.getAttribute("type") == "powerupSpeed") {
            player.maxSpeed += 0.07 * speedLimit;
            if (player.maxSpeed > speedLimit) {
                player.maxSpeed = speedLimit;
            }
        }
        else if(powerup.getAttribute("type") == "powerupPower") {
            player.bombPower++;
        }
        else if(powerup.getAttribute("type") == "powerupRandom") {
            var rand = Math.random();
            console.log(rand);
            if(rand <= 0.25) {
                player.bombCount++;
            }
            else if (rand <= 0.45){
                player.maxSpeed += 0.07 * speedLimit;
                if (player.maxSpeed > speedLimit) {
                    player.maxSpeed = speedLimit;
                }
            }
            else if (rand <= 0.65) {
                player.bombPower++;
            }
            else if (rand <= 0.75) {
                player.placingBombs = true;
                player.forcePlacingBombs = true;
                setTimeout(function() {
                    player.placingBombs = false;
                    player.forcePlacingBombs = false;
                }, 6000);
            }
            else {
                if (player.walkingDirectionMult == 1) {
                    var confusedSVG = document.createElementNS("http://www.w3.org/2000/svg", "use");
                    var playerParent = document.getElementById(player.id);
                    confusedSVG.setAttributeNS("http://www.w3.org/1999/xlink", "href", "svg/player.svg#confused");
                    playerParent.appendChild(confusedSVG);
                    player.walkingDirectionMult = -1;
                    player.curSpeedX = -player.curSpeedX;
                    player.curSpeedY = -player.curSpeedY;
                    setTimeout(function() {
                        player.walkingDirectionMult = 1;
                        player.curSpeedX = -player.curSpeedX;
                        player.curSpeedY = -player.curSpeedY;
                        playerParent.removeChild(playerParent.children[1]); // confusion will always be the second child but only as long as there are no other effects
                    }, 6000);
                }
            }

        }
        powerups.removeChild(powerup);
    }
}