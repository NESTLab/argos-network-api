/*  */
(function (w) {
  var ConnectWebSockets = function () {
    var sockets_api = server + "?broadcasts,logs";

    /* use wss:// for SSL supported */
    if (window.location.protocol == 'https:') {
      sockets_api = "wss://" + sockets_api
    } else {
      sockets_api = "ws://" + sockets_api
    }

    window.wsp = new window.WebSocketAsPromised(sockets_api, {
      packMessage: data => JSON.stringify(data),
      unpackMessage: data => JSON.parse(data),
      createWebSocket: url => {
        return new RobustWebSocket(url, null, {
          // The number of milliseconds to wait before a connection is considered to have timed out. Defaults to 4 seconds.
          timeout: 2000,
          // A function that given a CloseEvent or an online event (https://developer.mozilla.org/en-US/docs/Online_and_offline_events) and the `RobustWebSocket`,
          // will return the number of milliseconds to wait to reconnect, or a non-Number to not reconnect.
          // see below for more examples; below is the default functionality.
          shouldReconnect: function (event, ws) {
            if (event.code === 1008 || event.code === 1011) return
            return [0, 3000, 10000][ws.attempts]
          },
          // A boolean indicating whether or not to open the connection automatically. Defaults to true, matching native [WebSocket] behavior.
          // You can open the websocket by calling `open()` when you are ready. You can close and re-open the RobustWebSocket instance as much as you wish.
          automaticOpen: true,
          // A boolean indicating whether to disable subscribing to the connectivity events provided by the browser.
          // By default RobustWebSocket instances use connectivity events to avoid triggering reconnection when the browser is offline. This flag is provided in the unlikely event of cases where this may not be desired.
          ignoreConnectivityEvents: true
        })
      }
    });


    wsp.onUnpackedMessage.addListener(data => {
      /* Only if the message is a broadcast message */
      if (data.type == "broadcast") {
        /* Update experiment */
        window.experiment.data = data;
        window.experiment.state = data.state

        /* Reset settings */
        $("#ff_button").removeClass('active')

        switch (data.state) {
          case 'EXPERIMENT_INITIALIZED':
            window.experiment.status = "Initialized";
            break;
          case 'EXPERIMENT_DONE':
            /* disable all buttons */
            $("#layout_app_layout_panel_top .button").addClass("disabled")
            /* Only enable reset button */
            $("#layout_app_layout_panel_top .button.reset-button")
              .removeClass("disabled")

            window.experiment.status = "Done";
            break;
          case 'EXPERIMENT_PAUSED':
            window.experiment.status = "Paused";
            break;
          case 'EXPERIMENT_FAST_FORWARDING':
            window.experiment.status = "Fast Forwarding";
            break;
          case 'EXPERIMENT_PLAYING':
            window.experiment.status = "Playing";
            break;
          default:
            window.experiment.status = "Unknown";
            break;
        }
        switch (data.state) {
          case 'EXPERIMENT_INITIALIZED':
          case 'EXPERIMENT_DONE':
          case 'EXPERIMENT_PAUSED':

            $("#play_button").removeClass('pause-button')
              .addClass('play-button')
              .removeClass('active')
              .attr("title", "Play experiment")
              .prop("title", "Play experiment")//for IE

            break;
          case 'EXPERIMENT_FAST_FORWARDING':
            $("#play_button").removeClass('play-button')
              .addClass('pause-button')
              .removeClass('active')
              .attr("title", "Pause experiment")
              .prop("title", "Pause experiment")//for IE

            $("#ff_button").addClass('active')
            break;
          case 'EXPERIMENT_PLAYING':
            $("#play_button").removeClass('play-button')
              .addClass('pause-button')
              .addClass('active')
              .attr("title", "Pause experiment")
              .prop("title", "Pause experiment")//for IE
          default:
            break;
        }

        window.experiment.counter = data.steps;


        if (!window.isInitialized) {
          window.isInitialized = true;

          /* TODO: calculate best scale */
          var scale__ = data.arena.size.x * 4;
          // Currently we need 50

          initSceneWithScale(scale__);

          /* Start Animation */
          animate();
        }
      } else if (data.type == "log") {
        if (data.messages) {
          var log_ = [], logerr_ = [];
          for (let i = 0; i < data.messages.length; i++) {
            if (data.messages[i].log_type == 'LOG') {
              log_.unshift("<div class='log'><pre><span class='b'>[t=" +
                data.messages[i].step + "]</span> " +
                data.messages[i].log_message + "</pre></div>");
            } else {
              logerr_.unshift("<div class='log'><pre><span class='b'>[t=" +
                data.messages[i].step + "]</span> " +
                data.messages[i].log_message + "</pre></div>");
            }
          }
          window.log_clusterize.prepend(log_)
          window.logerr_clusterize.prepend(logerr_)
        }
      }

      /* Updating old state, to detect change in state */
      if (window.experiment.old_state != window.experiment.state) {
        console.log("Change");

        /* Maybe the experiment was reset */
        if (window.experiment.state == "EXPERIMENT_INITIALIZED") {
          /* If previously was done, reset button states */
          if (window.experiment.old_state == "EXPERIMENT_DONE") {
            $("#layout_app_layout_panel_top .button").removeClass("disabled")
          }
          setTimeout(() => { // due to some racing issues
            window.log_clusterize.clear()
            window.logerr_clusterize.clear()
          }, 10);
        }

        window.experiment.old_state = window.experiment.state
      }
    });
    wsp.onOpen.addListener(() => {
      console.log('Connection opened')
      window.experiment.connection = "Connected";
      window.experiment.isConnected = true;
    });

    wsp.onClose.addListener(() => {
      console.log('Connection closed')
      window.experiment.connection = "Not Connected";
      window.experiment.isConnected = false;
    });

    wsp.open().catch(e => console.error(e));
  }

  // commonjs
  if (typeof module !== "undefined") {
    module.exports = ConnectWebSockets;
  }
  else {
    w.ConnectWebSockets = ConnectWebSockets;
  }
}(typeof global !== "undefined" ? global : this));