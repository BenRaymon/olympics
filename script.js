// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.4/firebase-app.js";
import * as rtdb from "https://www.gstatic.com/firebasejs/9.9.4/firebase-database.js"
import * as fbauth from "https://www.gstatic.com/firebasejs/9.9.4/firebase-auth.js";

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
let auth = fbauth.getAuth(app);

let gamesRef = rtdb.ref(db, `/games`);
let teamsRef = rtdb.ref(db, `/teams`);

let gameNames;
let teamNames;
let gamesData;
let teamsData;

const ROUND_COUNT = 4;

let showButtons = false;

// enter password to enable buttons
$('#authenticate').on('click', (event)=>{
    let email = 'test@test.com';
    let pwd = $('#password')[0].value;
    fbauth.signInWithEmailAndPassword(auth, email, pwd).then((ss) => {
        $('#password')[0].value = '';
        showButtons = true;
    }).catch((error) => {
        console.log(error)
    });
});

// on initial page load - get current database objects
rtdb.get(gamesRef).then((response)=>{
    gamesData = response.val();    
    gameNames = Object.keys(gamesData);
});
rtdb.get(teamsRef).then((response)=>{
    teamsData = response.val();
    teamNames = Object.keys(teamsData);
});

// submit winner button in modal
$('#submit-winner').on('click', (event)=>{
    // get winner from checkbox
    let winner = $(`#teamRadio1`)[0].checked ? $(`#teamLabel1`)[0].innerHTML : ($(`#teamRadio2`)[0].checked ? $(`#teamLabel2`)[0].innerHTML : null);
    
    let gameName = $(`#game-title`)[0].innerHTML.split('-')[0].trim();
    let roundNum = $(`#game-title`)[0].innerHTML.split('-')[1].trim().split(' ')[1];
    
    let gameData = gamesData[gameName];

    if (!gameData[`game${roundNum}`].is_playing){
        $('#exampleModal').modal('toggle');
        alert('Start round before picking a winner');
        return;
    }

    if (!winner){
        alert("Must pick a winning team to submit winner");
        return;
    }

    setGamePlayed(gameData[`game${roundNum}`], gameName, roundNum, winner);
    $('#exampleModal').modal('toggle');
    $(`#teamRadio1`)[0].checked = false;
    $(`#teamRadio2`)[0].checked = false;

});

// updates the games list with the current status
function updateGames(){
    rtdb.get(gamesRef).then(async (response)=>{
        $('#games-table').empty();
        gamesData = response.val();

        for(let game of gameNames){
            $('#games-table').append(`
            <tr class="list__row__game" id=${game} data-game='${game}' data-games='${JSON.stringify(gamesData[game])}'>
                <td class="list__cell"><span class="list__value" id='round'>1</span></td>
                <td class="list__cell"><span class="list__value" id='${game}'>${game}</span></td>
            </tr>`);

            if (game == 'shotgun'){
                if($(`#table-${game}`)[0]?.innerHTML){
                    $(`#table-${game}`)[0].innerHTML = await createGameSidebarContent(gamesData[game], game);
                }
                continue;
            }
    
            let played = false;

            for(let i = 1; i <= ROUND_COUNT; i++){
                // find and set the current round number
                if(!played && !gamesData[game][`game${i}`]['played']){
                    played = true;
                    $(`#games-table #${game}`)[0].children[0].children[0].innerHTML = i;
                }

                // populate the sidebar popout with game information
                if($(`#table-${game}`)[0]?.innerHTML){
                    $(`#table-${game}`)[0].innerHTML = await createGameSidebarContent(gamesData[game], game); 
                    $(`#table-${game} #startgame`).on('click', ()=>{startGame(game)});
                    $(`#table-${game} #setwin`).on('click', ()=>{updateModal(game)});
                } 
            }
        }
        addGameRowListeners();
    });    
}
updateGames();


// update leaderboard with current teams status
function updateTeams(){
    rtdb.get(teamsRef).then(response=>{
        teamsData = response.val();
        // list of team names in order of most points
        let teams = Object.entries(teamsData).sort((a,b) => b[1].score-a[1].score).map(el=> el[0]);
        $('#teams-table').empty();

        let place = 1;
        for (let team of teams){
            let gamesPlayed = [];
            for (let gameName of gameNames){
                if (teamsData[team]['games_played'][gameName])
                    gamesPlayed.push(gameName);
            }
            // set leaderboard row for the team
            $('#teams-table').append(`
            <tr class="list__row__team" data-gamesplayed=${gamesPlayed}>
              <td class="list__cell"><span class="list__value">${place}</span></td>
              <td class="list__cell"><span class="list__value">${team}</span></td>
              <td class="list__cell val"><span class="list__value">${teamsData[team].wins}</span><small class="list__label">Wins</small></td>
              <td class="list__cell val"><span class="list__value">${teamsData[team].score}</span><small class="list__label">Points</small></td>
            </tr>`);

            place++;
        }
        addTeamRowListeners();
    });
}
updateTeams();


// update modal to show the teams playing the current round of that game
function updateModal(gameName){
    let gameRef = rtdb.ref(db, `/games/${gameName}`);
    rtdb.get(gameRef).then((response)=>{
        let gameData = response.val();
        for(let i = 1; i <= ROUND_COUNT; i++){ 
            if(!gameData[`game${i}`].played){
                if (i == ROUND_COUNT){
                    $(`#game-title`)[0].innerHTML = `${gameName} - finals round`;
                } else {
                    $(`#game-title`)[0].innerHTML = `${gameName} - round ${i}`;
                }
                $(`#teamLabel1`)[0].innerHTML = gameData[`game${i}`]['team1'];
                $(`#teamLabel2`)[0].innerHTML = gameData[`game${i}`]['team2'];
                break;
            }
        }
    });
}


// start the on deck round
// updates game info in database 
function startGame(gameName){
    let gameRef = rtdb.ref(db, `games/${gameName}`);
    let gameData = gamesData[gameName];

    for(let i = 1; i <= ROUND_COUNT; i++){ 
        if(!gameData[`game${i}`].played){
            if (i == ROUND_COUNT) {
                if (gameData[`game${i}`].team1 == '?' || gameData[`game${i}`].team2 == '?') {
                    let matchedTeams = findMatchup(gameName);
                    if (matchedTeams){
                        gameData[`game${i}`].team1 = matchedTeams[0].team;
                        gameData[`game${i}`].team2 = matchedTeams[1].team;
                    } else { return; }
                }
            }
            gameData[`game${i}`].is_playing = true;
            gameData[`game${i}`].on_deck = false;
            
            if (i+1 <= ROUND_COUNT)
                gameData[`game${i+1}`].on_deck = true;

            
            rtdb.update(gameRef, gameData).then(()=>{
                updateGames();
            });
                
            break;
        }
    }
}


// increase win count / mark game as played
// updates team info in database for both playing teams
// updates game info in database for game played
function setGamePlayed(gameRoundData, gameName, roundNum, winner){

    let otherTeam = winner == gameRoundData['team1'] ? gameRoundData['team2'] : gameRoundData['team1'];

    let gameRoundRef = rtdb.ref(db, `games/${gameName}/game${roundNum}`);
    gameRoundData.is_playing = false;
    gameRoundData.played = true;
    gameRoundData.winner = winner;

    rtdb.update(gameRoundRef, gameRoundData).then(()=>{
        updateGames();
    });

    // set game played and increase wins and score for winning team
    teamsData[winner]['wins'] += 1;
    // regular game +10 points, finals round +15 points
    teamsData[winner]['score'] += (roundNum < ROUND_COUNT) ? 10 : (roundNum == ROUND_COUNT ? 15 : 0);     
    teamsData[winner]['games_played'][`${gameName}`] = true;
    
    // set game played for losing team
    teamsData[otherTeam]['games_played'][`${gameName}`] = true;

    rtdb.update(teamsRef, teamsData).then(()=>{
        updateTeams();
    });

    // // finals round
    // if (roundNum == ROUND_COUNT - 1){
    //     let winners = findMatchup(gameName);
    //     if (winners) {
    //         gameRoundData.team1 = winners[0].team;
    //         gameRoundData.team2 = winners[1].team;
    //     }
    // }

}

function findMatchup(gameName){
    let winners = [];
    for (let i = 1; i < ROUND_COUNT; i++){
        winners.push({
            score: teamsData[gamesData[gameName][`game${i}`].winner].score, 
            team: gamesData[gameName][`game${i}`].winner
        });
    }
    
    winners.sort((a,b) => a.score - b.score);
    
    if (winners[0].score == winners[1].score){
        alert(`TIEBREAKER ${winners[0].team} - ${winners[1].team}`);
        return null;
    } else {
        winners.shift();
        return winners;
    }
    
}

function saveShotgunResults(){
    // make data a list of objects, each key is an int i and each value is the team in (i+1) place
    // 0 = 1st place, 1 = 2nd place ...
    let data = {};
    for (let team of teamNames) {
        if ($(`#${team}-select`)[0].value == 'Select') {
            alert('Select the standing for every team');
            return;
        } else if (data[$(`#${team}-select`)[0].value]){
            alert('Two teams cannot have the same standing');
            return;
        }

        data[$(`#${team}-select`)[0].value] = team;
    }

    let standings = Object.values(data);
    let i = 0;
    for (let team of standings){
        let teamData = teamsData[team];
        teamData['games_played'][`shotgun`] = true;
        // points are alloted as follows: 10, 7, 4, 1, (everyone else 0)
        if (10-3*i > 0)
            teamData['score'] += 10-3*i;

        i++;
    }

    rtdb.update(teamsRef, teamsData).then(()=>{
        updateTeams();
    });

    data['played'] = true;

    let shotgunRef = rtdb.ref(db, '/games/shotgun/');
    rtdb.set(shotgunRef, data);
}


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

function addGameRowListeners(){
    let tableRow = document.querySelectorAll(".list__row__game");
    tableRow.forEach(tableRow => {
        tableRow.addEventListener("click", async function() {
            overlay.style.opacity = 0;
            overlay.classList.add("is-open");
            sidebar.classList.add("is-open");
            setTimeout(() => {
                overlay.style.opacity = 1;
            }, 100);
            
            // Sidebar content
            const sidebarTitle = document.querySelector(".sidebar__title");
            sidebarTitle.innerHTML = 'Game Information';

            const sidebarBody = document.querySelector(".sidebar__body");
            sidebarBody.innerHTML = '';
            
            const games = JSON.parse(this.dataset.games);
            const game = this.dataset.game;

            const newGame = document.createElement('div');
            newGame.classList = 'info';
            
            const content = document.createElement('div');
            content.classList = 'info__content';
            
            const title = document.createElement('div');
            title.classList = 'info__title';
            title.innerHTML = game;
            content.appendChild(title);
            
            const gameInfo = document.createElement('div');
            gameInfo.innerHTML = await createGameSidebarContent(games, game);
            content.appendChild(gameInfo);
            
            newGame.appendChild(content);
            sidebarBody.appendChild(newGame);

            if (game != 'shotgun'){
                $(`#table-${game} #startgame`).on('click', ()=>{startGame(game)});
                $(`#table-${game} #setwin`).on('click', ()=>{updateModal(game)});
            } else {
                $('#saveresults').on('click', ()=>{saveShotgunResults()});
            }
            
        });
    });

}


function addTeamRowListeners(){
    let tableRow = document.querySelectorAll(".list__row__team");
    tableRow.forEach(tableRow => {
        tableRow.addEventListener("click", function() {
            overlay.style.opacity = 0;
            overlay.classList.add("is-open");
            sidebar.classList.add("is-open");
            setTimeout(() => {
                overlay.style.opacity = 1;
            }, 100);
            
            // Sidebar content
            const sidebarTitle = document.querySelector(".sidebar__title");
            sidebarTitle.innerHTML = 'Team Information';

            const sidebarBody = document.querySelector(".sidebar__body");
            sidebarBody.innerHTML = '';
            
            const place = this.querySelector(".list__cell:nth-of-type(1) .list__value").innerHTML;
            const teamName = this.querySelector(".list__cell:nth-of-type(2) .list__value").innerHTML;
            const wins = this.querySelector(".list__cell:nth-of-type(3) .list__value").innerHTML;
            const score = this.querySelector(".list__cell:nth-of-type(4) .list__value").innerHTML;


            const gamesPlayed = this.dataset.gamesplayed.split(',');
            
            const newTeam = document.createElement('div');
            newTeam.classList = 'info';
            
            const content = document.createElement('div');
            content.classList = 'info__content';
            
            const title = document.createElement('div');
            title.classList = 'info__title';
            title.innerHTML = teamName;
            content.appendChild(title);
            
            const teamInfo = document.createElement('div');
            teamInfo.innerHTML = `
            <table class="info__table ${teamName}">
                <tbody>
                    <tr>
                        <td><small>Place</small></td>
                        <td id='place'>${place}</td>
                    </tr>
                    <tr>
                        <td><small>Wins</small></td>
                        <td id='wins'>${wins}</td>
                    </tr>
                    <tr>
                        <td><small>Points</small></td>
                        <td id='score'>${score}</td>
                    </tr>
                    <tr>
                        <td>Games</td>
                    </tr>
                    ${createGamesPlayed(gamesPlayed)}
                </tbody>
            </table>`;
            content.appendChild(teamInfo);
            
            newTeam.appendChild(content);
            sidebarBody.appendChild(newTeam);

            if (showButtons) {
                addPointsListeners(teamName);
            }
            
        });
    });
}

function addPointsListeners(teamName){
    $("#addpoint").on('click', ()=>{
        $(`.${teamName} #score`)[0].innerHTML = parseInt($(`.${teamName} #score`)[0].innerHTML) + 1;
    });

    $("#subtractpoint").on('click', ()=>{
        $(`.${teamName} #score`)[0].innerHTML = parseInt($(`.${teamName} #score`)[0].innerHTML) - 1;
    });

    $("#updatepoints").on('click', ()=>{
        let score  = parseInt($(`.${teamName} #score`)[0].innerHTML);
        let teamRef = rtdb.ref(db, `teams/${teamName}`);
        rtdb.update(teamRef, {'score': score}).then(()=>{
            updateTeams();
        });
    });
}

closeOverlayBtn.addEventListener("click", function() {
	sidebarClose();
});

overlay.addEventListener("click", function() {
	sidebarClose();
});

async function createGameSidebarContent(games, game){

    if (game == 'shotgun'){
        return `
        <table class="info__table" id='table-${game}'>
            <tbody>
                ${await createTeamSelect()}
            </tbody>
        </table>`;
    } else {
        return `
        <div id='table-${game}'>
            <table class="info__table">
                <tbody>
                    ${createRounds(games)}
                </tbody>
            </table>
            ${showButtons ? `<button class="btn btn-primary" id="startgame">Start Next Game</button>
            <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#exampleModal" id="setwin">Set Winner</button>` : ''} 
        </div>`;
    }
}

async function createTeamSelect(){
    let content = ``;
    let options = ``;
    let places = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];
    let i = 0;

    let shotgunRef = rtdb.ref(db, '/games/shotgun/');
    let x = await rtdb.get(shotgunRef).then((response)=>{
        let gameData = response.val();
        let teamStandings = Object.values(gameData);
        teamStandings.pop();
        if (gameData['played']){
            for (let team of teamStandings) {
                content += `<tr>
                    <td>${team}: </td>
                    <td>${places[teamStandings.indexOf(team)]}</td>
                </tr>`
            }
        } else {
            for (let team of teamNames){
                options += `<option value="${i}">${places[i]} Place</option>`;
                i++;
            }

            for (let team of teamNames) {
                content += `<tr>
                    <td>${team}: </td>
                    <td>
                        <select class="form-select" id='${team}-select'>
                            <option selected>Select</option>
                            ${options}
                        </select>
                    </td>
                </tr>`
            } 

            if(showButtons) {
                content += `
                <tr>
                    <td>
                        <button class="btn btn-primary" id="saveresults">Save Results</button>
                    </td>
                </tr>`
            }
        }

        return content;
    });
    return x;
}

function createRounds(games){
    let content = ``;
    for (let i = 1; i <= ROUND_COUNT; i++){
        content += `<tr>
            <td>${i == ROUND_COUNT ? 'finals round' : 'round '+i}:</td>
            <td>${games[`game${i}`]['is_playing'] ? 'Playing Now' : (games[`game${i}`]['on_deck'] ? 'On Deck' : (games[`game${i}`]['played'] ? 'Game Over' : ''))}</td>
            <td>${games[`game${i}`]['winner'] ? games[`game${i}`]['winner'] : games[`game${i}`]['team1']}</td>
            <td>${games[`game${i}`]['winner'] ? 'beat' : 'vs' }</td>
            <td>${games[`game${i}`]['winner'] ? (games[`game${i}`]['winner'] == games[`game${i}`]['team1'] ? games[`game${i}`]['team2'] : games[`game${i}`]['team1'] ) : games[`game${i}`]['team2']}</td>
        </tr>`
    }
    return content;
    
}

function createGamesPlayed(gamesPlayed){
    let content = ``;
    for (let game of gameNames){
        content += `<tr>
            <td><small>${game}</small></td>
            <td>${gamesPlayed.includes(game) ? 'Played' : 'Haven\'t Played'}</td>
        </tr>`
    }
    if(showButtons) {
        content += `
        <tr>
            <td>
                <button id="addpoint" class="btn btn-primary">Add a point</button>
                <button id="subtractpoint" class="btn btn-primary">Subtract a point</button>
            </td>
            <td>
                <button class="btn btn-primary" id="updatepoints">Update Team Score</button>
            </td>
        </tr>`
    }
    return content;
    
}