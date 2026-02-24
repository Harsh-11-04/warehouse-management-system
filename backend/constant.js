class PUBLIC_DATA {

    static port = process.env.PORT || 4000
    static mongo_uri = process.env.MONGO_URI || `mongodb://127.0.0.1/inventry`
    static jwt_auth = process.env.JWT_AUTH || "@#$%^&*(@#$%^&*($%^))#$%^&"

}

module.exports = {
    PUBLIC_DATA
}