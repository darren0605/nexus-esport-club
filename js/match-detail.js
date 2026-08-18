
$(function () {

  var teamNames = $(".team-header-box h2")
    .map(function () {
      return $(this).text().trim();
    })
    .get(); 

  var storageKey = "cs2_comments::" + window.location.pathname;

  buildHeadToHead(teamNames);
  buildCommentSection(storageKey);

  /* -----------------------------------------------------------------------
     1. HEAD-TO-HEAD WIDGET (jQuery AJAX call to the match-data API)
     ----------------------------------------------------------------------- */
  function buildHeadToHead(teams) {
    if (teams.length < 2) return; // safety check, page not in expected format

    var teamA = teams[0];
    var teamB = teams[1];
    var currentPage = window.location.pathname.split("/").pop();

    $.ajax({
      url: "data/matches.json",
      method: "GET",
      dataType: "json"
    })
      .done(function (data) {
        var history = [];

        data.events.forEach(function (event) {
          event.matches.forEach(function (match) {
            var involvesBoth =
              (match.team1 === teamA && match.team2 === teamB) ||
              (match.team1 === teamB && match.team2 === teamA);

            var linkPage = (match.link || "").split("?")[0];
            var isCurrentMatch = linkPage === currentPage;

            if (involvesBoth && !isCurrentMatch) {
              history.push({ event: event.name, match: match });
            }
          });
        });

        renderHeadToHead(history);
      })
      .fail(function () {
        renderHeadToHead(null); // API failed — show a friendly fallback
      });
  }

  function renderHeadToHead(history) {
    var $section = $(
      '<section class="info-card" id="head-to-head-card">' +
        "<h3>Head-to-Head History</h3>" +
        '<div id="h2h-content"></div>' +
        "</section>"
    );
    $(".main-container").append($section);

    var $content = $("#h2h-content");

    if (history === null) {
      $content.html("<p>Could not load match history right now.</p>");
      return;
    }
    if (history.length === 0) {
      $content.html("<p>This is the first meeting between these two teams in our records.</p>");
      return;
    }

    var $list = $('<ul class="h2h-list"></ul>');
    history.forEach(function (item) {
      var href = item.match.link && item.match.link !== "#" ? item.match.link : null;
      var line =
        item.match.team1 +
        " " +
        item.match.score +
        " " +
        item.match.team2 +
        " — " +
        item.event +
        " (" +
        item.match.stage +
        ")";

      var $li = $("<li></li>");
      if (href) {
        $li.html('<a href="' + href + '">' + line + "</a>");
      } else {
        $li.text(line);
      }
      $list.append($li);
    });

    $content.append($list);
  }

  /* -----------------------------------------------------------------------
     2. FAN COMMENT SECTION (LocalStorage, unique per match page)
     ----------------------------------------------------------------------- */
  function buildCommentSection(key) {
    var $section = $(
      '<section class="info-card" id="comments-card">' +
        "<h3>Fan Comments</h3>" +
        '<div class="comment-form">' +
        '<input type="text" id="comment-name" placeholder="Your name" maxlength="30">' +
        '<textarea id="comment-text" placeholder="Say something about this match..." maxlength="300"></textarea>' +
        '<button type="button" id="comment-submit" class="btn btn-action">Post Comment</button>' +
        "</div>" +
        '<ul id="comment-list" class="comment-list"></ul>' +
        "</section>"
    );
    $(".main-container").append($section);

    renderComments(key);

    $("#comment-submit").on("click", function () {
      var name = $("#comment-name").val().trim();
      var text = $("#comment-text").val().trim();

      if (!name || !text) {
        alert("Please enter your name and a comment before posting.");
        return;
      }

      var comments = getComments(key);
      comments.push({
        name: name,
        text: text,
        time: new Date().toLocaleString()
      });
      saveComments(key, comments);

      $("#comment-text").val("");
      renderComments(key);
    });
  }

  function getComments(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Error reading comments from LocalStorage:", e);
      return [];
    }
  }

  function saveComments(key, comments) {
    try {
      localStorage.setItem(key, JSON.stringify(comments));
    } catch (e) {
      console.error("Error saving comments to LocalStorage:", e);
    }
  }

  function renderComments(key) {
    var comments = getComments(key);
    var $list = $("#comment-list").empty();

    if (comments.length === 0) {
      $list.html('<li class="comment-empty">No comments yet — be the first!</li>');
      return;
    }

    comments.forEach(function (c, index) {
      var $item = $(
        '<li class="comment-item">' +
          '<div class="comment-meta"><strong></strong> <span class="comment-time"></span></div>' +
          '<p class="comment-body"></p>' +
          '<button type="button" class="comment-delete" data-index="' +
          index +
          '">Delete</button>' +
          "</li>"
      );
      $item.find("strong").text(c.name);
      $item.find(".comment-time").text(c.time);
      $item.find(".comment-body").text(c.text);
      $list.append($item);
    });

    $(".comment-delete").on("click", function () {
      var idx = $(this).data("index");
      var comments = getComments(key);
      comments.splice(idx, 1);
      saveComments(key, comments);
      renderComments(key);
    });
  }
});
