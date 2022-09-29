export interface PutNoteRequest {
    "note_id" : number,
    "note_body" : string,
    "position" : {
        "x" : number,
        "y" : number
    }
}