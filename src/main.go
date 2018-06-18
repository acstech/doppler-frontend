package main

import (
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "index.html")
	})

	http.HandleFunc("/v1/ws", func(w http.ResponseWriter, r *http.Request) {
		var conn, _ = upgrader.Upgrade(w, r, nil)
		go func(conn *websocket.Conn) {
			for {
				mType, msg, _ := conn.ReadMessage() // Reads message form the client and sends type

				conn.WriteMessage(mType, msg) // mType is the type of message form the Gorilla
			}
		}(conn)
	})

	http.HandleFunc("/v2/ws", func(w http.ResponseWriter, r *http.Request) {
		var conn, _ = upgrader.Upgrade(w, r, nil)
		go func(conn *websocket.Conn) {
			for {
				_, msg, _ := conn.ReadMessage()
				println(string(msg))
			}
		}(conn)
	})

	http.HandleFunc("/v3/ws", func(w http.ResponseWriter, r *http.Request) { // "v3/ws" will be called by the javascript to make the event calls
		var conn, _ = upgrader.Upgrade(w, r, nil)
		go func(conn *websocket.Conn) {
			ch := time.Tick(5 * time.Second)

			for range ch { // sends a JSON object to the front-end
				conn.WriteJSON(Coord{
					Latitude:  "43.029383",
					Longitude: "83.093763",
					Count:     "8",
				})
			}
		}(conn)
	})

	// in the javascript the code would be // var ws = new WebSocket("ws://localhost:8000/v3/ws")
	http.ListenAndServe(":8000", nil) // :8000 port for communicating with server and front end

} /// end of main

// the struct for our coordnant
type Coord struct {
	Latitude  string `json:"lat"`
	Longitude string `json:"lng"`
	Count     string `json:"count"`
}
