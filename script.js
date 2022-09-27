// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.4/firebase-app.js";
import * as rtdb from "https://www.gstatic.com/firebasejs/9.9.4/firebase-database.js"
import * as fbauth from "https://www.gstatic.com/firebasejs/9.9.4/firebase-auth.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBCplbcBc6Ofc7Yy4ZvJZa8oXh5rmeZgLc",
    authDomain: "olympics-91f1f.firebaseapp.com",
    databaseURL: "https://olympics-91f1f-default-rtdb.firebaseio.com",
    projectId: "olympics-91f1f",
    storageBucket: "olympics-91f1f.appspot.com",
    messagingSenderId: "146188282258",
    appId: "1:146188282258:web:d67ed0113c4cd3b63df94b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let db = rtdb.getDatabase(app);

let games = rtdb.ref(db, `/games`);

const TEAM_COUNT = 8;
const GAME_COUNT = TEAM_COUNT/2;

resetDatabase();

rtdb.get(games).then((response)=>{
    let data = response.val();
    for(let game of Object.keys(data)){
        $(`#${game} #setwin`).on('click', ()=>{
            let gameRef = rtdb.ref(db, `/games/${game}`);
            rtdb.get(gameRef).then((response)=>{
                let data = response.val();
                for(let i = 1; i <= GAME_COUNT; i++){ 
                    if(!data[`game${i}`].played){
                        $(`#game-title`)[0].innerHTML = `${game} - game ${i}`;
                        let team1 = data[`game${i}`]['team1'];
                        let team2 = data[`game${i}`]['team2'];
                        $(`#teamLabel1`)[0].innerHTML = team1;
                        $(`#teamLabel2`)[0].innerHTML = team2;
                        break;
                    }
                }
            });
        });
    }
});

$('#submit-winner').on('click', (event)=>{
    let winner;
    if ($(`#teamRadio1`)[0].checked)
        winner = $(`#teamLabel1`)[0].innerHTML;
    else if ($(`#teamRadio2`)[0].checked)
        winner = $(`#teamLabel2`)[0].innerHTML;
    else alert("MUST PICK WINNER");

    if (winner){
        let gameName = $(`#game-title`)[0].innerHTML.split('-')[0].trim();
        let gameNum = $(`#game-title`)[0].innerHTML.split('-')[1].trim().replace(' ', '');
        let gameRef = rtdb.ref(db, `/games/${gameName}/${gameNum}/`);
        rtdb.update(gameRef, {winner: winner}).then(()=> {
            $('#exampleModal').modal('toggle');
            $(`#teamRadio1`)[0].checked = false;
            $(`#teamRadio2`)[0].checked = false;
        });
    }

});

// updates the games on the screen with the current status
function updateGames(){
    rtdb.get(games).then((response)=>{
        let data = response.val();
        for(let game of Object.keys(data)){
    
            for(let i = 1; i <= GAME_COUNT; i++){
                console.log(i);
                $(`#${game} #game${i}`)[0].innerHTML = `Game ${i}: ${data[game][`game${i}`]['team1']} vs ${data[game][`game${i}`]['team2']}`;
                if (data[game][`game${i}`]['winner']){
                    $(`#${game} #game${i}`)[0].innerHTML += `- ${data[game][`game${i}`]['winner']} WON`;
                } else if (data[game][`game${i}`]['is_playing']){
                    $(`#${game} #game${i}`)[0].innerHTML += ' - PLAYING NOW';
                } else if (data[game][`game${i}`]['on_deck']){
                    $(`#${game} #game${i}`)[0].innerHTML += ' - ON DECK';
                }   
            }
            
        }
        
    });    
}

updateGames();

function updateTeams(){
    let teamsRef = rtdb.ref(db, 'teams');
    rtdb.get(teamsRef).then(response=>{
        let data = response.val();
        let teams = Object.keys(data);
        $('#allteams').empty();

        for (let team of teams){
            let gamesPlayed = [];
            let gameNames = Object.keys(data[team]['games_played']);
            for (let gameName of gameNames){
                if (data[team]['games_played'][gameName])
                    gamesPlayed.push(gameName);
            }
            $('#allteams').append(
                `<div class="col" id="${team}">
                    <h3 id="name">${team}</h3>
                    <p id="played">Games Played: ${gamesPlayed}</p>
                    <p id="wins">Team Wins: ${data[team].wins}</p>
                    <p id="score">Team Score: ${data[team].score}</p>
                </div>`
            );
        }

    });
}
updateTeams();


// change listener for 'winner' under each game/game#
// set current teams to be not playing, on deck team --> playing, next next team --> on deck
// increase wins count for the winning team and mark both teams as played this game
rtdb.get(games).then((response)=>{
    let data = response.val();
    for(let game of Object.keys(data)){
        for (let i = 1; i <= GAME_COUNT; i++){
            let gameWinner = rtdb.ref(db, `/games/${game}/game${i}/winner`);
            rtdb.onValue(gameWinner, response=>{
                let winningTeam = response.val();
                if(winningTeam){
                    let gameRef = response.ref.parent.parent;
                    rtdb.get(gameRef).then(response =>{
                        // update is_playing and on_deck
                        let games = response.val();
                        games[`game${i}`].is_playing = false;
                        games[`game${i}`].played = true;
            
                        if(i+1 <= GAME_COUNT){
                            games[`game${i+1}`].is_playing = true;
                            games[`game${i+1}`].on_deck = false;
                        }
                        if (i+2 <= GAME_COUNT)
                            games[`game${i+2}`].on_deck = true;
    
                        // update team info for winning / playing the game
                        let otherTeam = winningTeam == games[`game${i}`]['team1'] ? games[`game${i}`]['team2'] : games[`game${i}`]['team1'];
                        updateTeamInfo(winningTeam, game, true);
                        updateTeamInfo(otherTeam, game, false);

                        
                        rtdb.update(gameRef, games).then(()=>{
                            updateGames();
                        });
        
                    });    
                }
            });       
        }
    }
    
});


// increase win count / mark game as played
function updateTeamInfo(teamName, game, win){
    let teamRef = rtdb.ref(db, `/teams/${teamName}`);
    rtdb.get(teamRef).then(response=>{
        let data = response.val();
        if (win) 
            data['wins'] += 1;
        data['games_played'][`${game}`] = true;

        rtdb.update(teamRef, data).then(()=>{
            updateTeams();
        });
    });
}


function resetDatabase(){
    let teamData = {};
    for(let i = 0; i < TEAM_COUNT; i++){
        teamData[`team${i+1}`] = {
            wins: 0,
            score: 0,
            games_played: {
                 beerball: false,
                 flip: false,
                 pong: false,
                 stack: false,
                 baseball: false 
            },
        }
    }
    
    console.log(teamData);
    rtdb.set(rtdb.ref(db, '/teams/'), teamData);
    
    
    let gameData = {"beerball": {}, "baseball": {}, "flip": {}, "stack": {}, "pong": {}, };
    for (let gameName of Object.keys(gameData)){
        for(let i = 0; i < GAME_COUNT; i++){
            gameData[gameName][`game${i+1}`] = {
                "is_playing": i == 0,
                "on_deck": i == 1,
                "played": false,
                "team1": `team${1+2*i}`,
                "team2": `team${2+2*i}`
            }
        }
    }

    console.log(gameData);
    rtdb.set(games, gameData);
    
}

