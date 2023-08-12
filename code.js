var allGames = {};
var allEvents = {};

// should get timezone from the user's browser, but we need a default just in case that fails
var userTimezone = "Etc/UTC";

// only turn this on if you really like the idea of lots and lots of console spew
const debug = false;
// it's useful to turn this off while debugging, so you don't get spew every second
const enableConstantUpdates = true;

function getUserTimezone() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return tz;
}

function nameForGame(game) {
  if (game in allGames) {
    return allGames[game].name;
  } else {
    if (debug) console.log("ERROR: unknown game `" + game + "'");
    return null;
  }
}

function timezoneForGame(game) {
  if (game in allGames) {
    return allGames[game].timezone;
  } else {
    if (debug) console.log("ERROR: unknown game `" + game + "'");
    return null;
  }
}

function getCurrentDate() {
  const currentDate = new Date();
  return currentDate.getFullYear() + '-'
            + ('0' + (currentDate.getMonth()+1)).slice(-2) + '-'
            + ('0' + currentDate.getDate()).slice(-2);
}

function dayResetForGame(game) {
  if (game in allGames) {
    return allGames[game].dayReset;
  } else {
    if (debug) console.log("ERROR: unknown game `" + game + "'");
    return null;
  }
}

function updateCountdown() {
  const keys = Object.keys(allEvents);
  const countdownContainer = $("#main");
  var foundValidEvents = false;
  var big_nasty_html_string = "";

  if (keys.length == 0) {
    if (debug) console.log("No events found");
    countdownContainer.html('<div class="row"><div class="col text-center"><h1>No Data</h1><h3>Ensure that the JSON file is properly formatted, then reload the page.</h3></div></div>');
    return;
  } else {
    if (debug) console.log("Found " + keys.length + " games");

    countdownContainer.empty();
    const now = moment.tz(moment(), userTimezone); // Replace with your current timezone
    
    keys.forEach(function (game) {
      var foundEventsOfNote = false;

      if (debug) console.log(game);
      const gameName = nameForGame(game);
      if (gameName == null) {
        if (debug) console.log("could not look up game");
        return;
      }

      // THIS IS DUMB (but it works, more or less)
      const gameTimezone = timezoneForGame(game);
      const dayReset = dayResetForGame(game);
      const dayResetDateString = getCurrentDate() + " " + dayReset;
      if (debug) console.log(dayResetDateString);
      
      var dayResetTime = moment.tz(dayResetDateString, gameTimezone);
      var dayResetTime2;
      if (now.isAfter(dayResetTime)) {
        if (debug) console.log("day reset is in the past, adding a day");
        // i'm not sure why we have to add 2 days here, but it works and I'm not asking questions
        dayResetTime2 = dayResetTime.clone().add(2, 'days');
      } else {
        dayResetTime2 = dayResetTime.clone();
      }
      const dayResetLocalTime = moment.tz(dayResetTime2, userTimezone);

      if (debug) console.log(dayResetTime);
      if (debug) console.log(dayResetLocalTime);
      
      const drHours = dayResetLocalTime.hours().toString().padStart(2, '0');
      const drMinutes = dayResetLocalTime.minutes().toString().padStart(2, '0');
      const drSeconds = dayResetLocalTime.seconds().toString().padStart(2, '0');
      const tillNextDay = moment.duration(dayResetLocalTime.diff(now));
      const drTillHours = tillNextDay.hours().toString().padStart(2, '0');
      const drTillMinutes = tillNextDay.minutes().toString().padStart(2, '0');
      const drTillSeconds = tillNextDay.seconds().toString().padStart(2, '0');

      var gameHtmlString = `<div class="row"><div class="col"><h2>${gameName}</h2>Day Resets At: ${drHours}:${drMinutes}:${drSeconds}<br />In ${drTillHours}:${drTillMinutes}:${drTillSeconds}</div><div class="col">`;

      allEvents[game].forEach(function (event) {
        if ('hidden' in event && event.hidden) {
          return;
        }

        if (debug) console.log(event);
        if (gameTimezone == null) {
          if (debug) console.log("could not look up timezone");
          return;
        }

        if (debug) console.log("parse " + event.start + " and " + event.end + " as " + gameTimezone);
        const startDate = moment.tz(event.start, gameTimezone);
        const endDate = moment.tz(event.end, gameTimezone);

        if (debug) console.log("START");
        if (debug) console.log(startDate.format());
        if (debug) console.log("END");
        if (debug) console.log(endDate.format());

        var tag = "";
        var targetDate;
      
        if (now.isAfter(endDate)) {
          if (debug) console.log("event " + event.event + " is but a distant memory");
          return;
        } else if (now.isBefore(startDate)) {
          foundEventsOfNote = true;
          if (debug) console.log("event " + event.event + " is in THE FUTURE (zura)");
          targetDate = startDate;
          tag = "Starts";
        } else if (now.isAfter(startDate) && now.isBefore(endDate)) {
          foundEventsOfNote = true;
          if (debug) console.log("event " + event.event + " is in the here and now");
          targetDate = endDate;
          tag = "Ends";
        } else {
          // this shouldn't happen...
          if (debug) console.log("oh no, you broke time again, didn't you?");
          return;
        }
        if (debug) console.log("target");
        if (debug) console.log(targetDate);

        const duration = moment.duration(targetDate.diff(now));
        const days = duration.days();
        const hours = duration.hours();
        const minutes = duration.minutes();
        const seconds = duration.seconds();

        if (days > 0) {
          gameHtmlString += `<h3>${event.event}</h3><h5>${tag} in ${days}d ${hours}h ${minutes}m ${seconds}s</h5>`;
        } else if (hours > 0) {
            gameHtmlString += `<h3>${event.event}</h3><h5>${tag} in ${hours}h ${minutes}m ${seconds}s</h5>`;
        } else {
            gameHtmlString += `<h3>${event.event}</h3><h5>${tag} in ${minutes}m ${seconds}s</h5>`;
        }
      });

      gameHtmlString += '</div></div><br />';

      if (foundEventsOfNote) {
        big_nasty_html_string += gameHtmlString;
        foundValidEvents = true;
      }
    });
  }

  if (debug) console.log(big_nasty_html_string);
  if (foundValidEvents) {
    countdownContainer.html(big_nasty_html_string);
  } else {
    countdownContainer.html('<div class="row"><div class="col text-center"><h1>No Valid Events Found</h1><h3>All events have passed.</h3></div></div>');
  }
}

$(document).ready(function() {
  if (debug) console.log("document ready called"); 

  userTimezone = getUserTimezone();
  if (debug) console.log("User's timezone:", userTimezone);

  $.ajaxSetup({ cache: false });
  $.getJSON('events.json', function(data) {
  }).done(function(data) {
    if (debug) console.log("JSON load successful");
    if (debug) console.log(data);
    allGames = data.games;
    allEvents = data.events;
  }).fail(function(jqXHR, textStatus, errorThrown) {
    console.error('JSON load error: ', errorThrown);
    allGames = {};
    allEvents = {};
  });

  if (enableConstantUpdates) {
    setInterval(updateCountdown, 1000);
  } else {
    // just one update
    updateCountdown();
  }
});
