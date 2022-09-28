// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.4/firebase-app.js";
import * as rtdb from "https://www.gstatic.com/firebasejs/9.9.4/firebase-database.js"
//import * as fbauth from "https://www.gstatic.com/firebasejs/9.9.4/firebase-auth.js";

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

let gamesRef = rtdb.ref(db, `/games`);
let teamsRef = rtdb.ref(db, `/teams`);

let gameNames;

const TEAM_COUNT = 5;
const GAME_COUNT = 3;

//resetDatabase();

// add listeners for SET WINNER + START NEXT GAME buttons in each game card
rtdb.get(gamesRef).then((response)=>{
    let gamesData = response.val();
    for(let game of Object.keys(gamesData)){
        $(`#${game} #startgame`).on('click', ()=>{startGame(game)});
        $(`#${game} #setwin`).on('click', ()=>{updateModal(game)});
    }
});

// submit winner button in modal
$('#submit-winner').on('click', (event)=>{
    // get winning team name from radios
    let winner;
    if ($(`#teamRadio1`)[0].checked)
        winner = $(`#teamLabel1`)[0].innerHTML;
    else if ($(`#teamRadio2`)[0].checked)
        winner = $(`#teamLabel2`)[0].innerHTML;
    else alert("MUST PICK WINNER");

    if (winner){
        let gameName = $(`#game-title`)[0].innerHTML.split('-')[0].trim();
        let roundNum = $(`#game-title`)[0].innerHTML.split('-')[1].trim().split(' ')[1];
        let gameRef = rtdb.ref(db, `/games/${gameName}`);
        
        rtdb.get(gameRef).then(response =>{
            // update is_playing and on_deck
            let gameData = response.val();
            gameData[`game${roundNum}`].is_playing = false;
            gameData[`game${roundNum}`].played = true;
            gameData[`game${roundNum}`].winner = winner;

            // update team info for winning / playing the game
            let otherTeam = winner == gameData[`game${roundNum}`]['team1'] ? gameData[`game${roundNum}`]['team2'] : gameData[`game${roundNum}`]['team1'];
            setGamePlayed(winner, gameName, true);
            setGamePlayed(otherTeam, gameName, false);

            rtdb.update(gameRef, gameData).then(()=>{
                updateGames();
                $('#exampleModal').modal('toggle');
                $(`#teamRadio1`)[0].checked = false;
                $(`#teamRadio2`)[0].checked = false;
            });

        });  

    }

});

// updates the games on the screen with the current status
function updateGames(){
    rtdb.get(gamesRef).then((response)=>{
        let gamesData = response.val();
        for(let game of Object.keys(gamesData)){
    
            for(let i = 1; i <= GAME_COUNT; i++){
                console.log(i);
                $(`#${game} #game${i}`)[0].innerHTML = `Game ${i}: ${gamesData[game][`game${i}`]['team1']} vs ${gamesData[game][`game${i}`]['team2']}`;
                if (gamesData[game][`game${i}`]['winner']){
                    $(`#${game} #game${i}`)[0].innerHTML += `- ${gamesData[game][`game${i}`]['winner']} WON`;
                } else if (gamesData[game][`game${i}`]['is_playing']){
                    $(`#${game} #game${i}`)[0].innerHTML += ' - PLAYING NOW';
                } else if (gamesData[game][`game${i}`]['on_deck']){
                    $(`#${game} #game${i}`)[0].innerHTML += ' - ON DECK';
                }   
            }
            
        }
    });    
}
updateGames();

// update leaderboard with current teams status
function updateTeams(){
    rtdb.get(teamsRef).then(response=>{
        let teamsData = response.val();
        // list of team names in order of most wins
        let teams = Object.entries(teamsData).sort((a,b) => b[1].wins-a[1].wins).map(el=> el[0]);
        $('#teams-table').empty();

        let place = 1;
        for (let team of teams){
            let gamesPlayed = [];
            gameNames = Object.keys(teamsData[team]['games_played']);
            for (let gameName of gameNames){
                if (teamsData[team]['games_played'][gameName])
                    gamesPlayed.push(gameName);
            }
            $('#teams-table').append(`
            <tr class="list__row" data-gamesplayed=${gamesPlayed}>
              <td class="list__cell"><span class="list__value">${place}</span></td>
              <td class="list__cell"><span class="list__value">${team}</span></td>
              <td class="list__cell"><span class="list__value">${teamsData[team].wins}</span><small class="list__label">Wins</small></td>
            </tr>`);

            place++;
        }

        addRowListeners();

    });
}
updateTeams();

// update modal for the correct game / round
function updateModal(game){
    let gameRef = rtdb.ref(db, `/games/${game}`);
    rtdb.get(gameRef).then((response)=>{
        let gameData = response.val();
        for(let i = 1; i <= GAME_COUNT; i++){ 
            if(!gameData[`game${i}`].played){
                $(`#game-title`)[0].innerHTML = `${game} - game ${i}`;
                let team1 = gameData[`game${i}`]['team1'];
                let team2 = gameData[`game${i}`]['team2'];
                $(`#teamLabel1`)[0].innerHTML = team1;
                $(`#teamLabel2`)[0].innerHTML = team2;
                break;
            }
        }
    });
}


// start the on deck round
function startGame(gameName){
    let gameRef = rtdb.ref(db, `games/${gameName}`);
    rtdb.get(gameRef).then(response =>{
        let gameData = response.val();
        for(let i = 1; i <= GAME_COUNT; i++){ 
            if(!gameData[`game${i}`].played){
                gameData[`game${i}`].is_playing = true;
                gameData[`game${i}`].on_deck = false;
                
                if (i+1 <= GAME_COUNT)
                    gameData[`game${i+1}`].on_deck = true;
                
                rtdb.update(gameRef, gameData).then(()=>{
                    updateGames();
                });
                    
                break;
            }
        }
    });   
}



// increase win count / mark game as played
function setGamePlayed(teamName, game, win){
    let teamRef = rtdb.ref(db, `/teams/${teamName}`);
    rtdb.get(teamRef).then(response=>{
        let teamData = response.val();
        if (win) 
            teamData['wins'] += 1;
        teamData['games_played'][`${game}`] = true;

        rtdb.update(teamRef, teamData).then(()=>{
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
    rtdb.set(teamsRef, teamData);
    
}



/* *********************** */

console.clear();

const overlay = document.querySelector(".overlay");
const sidebar = document.querySelector(".sidebar");
const closeOverlayBtn = document.querySelector(".button--close");

const sidebarClose = () => {
	sidebar.classList.remove("is-open");
	overlay.style.opacity = 0;
	setTimeout(() => {
		overlay.classList.remove("is-open");
		overlay.style.opacity = 1;
	}, 300);
};

function addRowListeners(){
    let tableRow = document.querySelectorAll(".list__row");
    tableRow.forEach(tableRow => {
        tableRow.addEventListener("click", function() {
            overlay.style.opacity = 0;
            overlay.classList.add("is-open");
            sidebar.classList.add("is-open");
            setTimeout(() => {
                overlay.style.opacity = 1;
            }, 100);
            
            // Sidebar content
            const sidebarBody = document.querySelector(".sidebar__body");
            sidebarBody.innerHTML = '';
            
            const place = this.querySelector(".list__cell:nth-of-type(1) .list__value").innerHTML;
            const teamName = this.querySelector(".list__cell:nth-of-type(2) .list__value").innerHTML;
            const score = this.querySelector(".list__cell:nth-of-type(3) .list__value").innerHTML;

            const gamesPlayed = this.dataset.gamesplayed.split(',');
            
            const newTeam = document.createElement('div');
            newTeam.classList = 'driver';
            
            const content = document.createElement('div');
            content.classList = 'driver__content';
            
            const title = document.createElement('div');
            title.classList = 'driver__title';
            title.innerHTML = teamName;
            content.appendChild(title);
            
            const teamInfo = document.createElement('div');
            teamInfo.innerHTML = `
            <table class="driver__table">
                <tbody>
                    <tr>
                        <td><small>Place</small></td>
                        <td>${place}</td>
                    </tr>
                    <tr>
                        <td><small>Wins</small></td>
                        <td>${score}</td>
                    </tr>
                    <tr>
                        <td>Games</td>
                    </tr>
                    <tr>
                        <td><small>${gameNames[0]}</small></td>
                        <td>${gamesPlayed.includes(gameNames[0]) ? 'Played' : 'Haven\'t Played'}</td>
                    </tr>
                    <tr>
                        <td><small>${gameNames[1]}</small></td>
                        <td>${gamesPlayed.includes(gameNames[1]) ? 'Played' : 'Haven\'t Played'}</td>
                    </tr>
                    <tr>
                        <td><small>${gameNames[2]}</small></td>
                        <td>${gamesPlayed.includes(gameNames[2]) ? 'Played' : 'Haven\'t Played'}</td>
                    </tr>
                    <tr>
                        <td><small>${gameNames[3]}</small></td>
                        <td>${gamesPlayed.includes(gameNames[3]) ? 'Played' : 'Haven\'t Played'}</td>
                    </tr>
                    <tr>
                        <td><small>${gameNames[4]}</small></td>
                        <td>${gamesPlayed.includes(gameNames[4]) ? 'Played' : 'Haven\'t Played'}</td>
                    </tr>
                </tbody>
            </table>`;
            content.appendChild(teamInfo);
            
            newTeam.appendChild(content);
            sidebarBody.appendChild(newTeam);
            
        });
    });
}

closeOverlayBtn.addEventListener("click", function() {
	sidebarClose();
});

overlay.addEventListener("click", function() {
	sidebarClose();
});