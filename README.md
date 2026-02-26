### uploading a scan
```
user → POST /scans
     → uploadScan lambda
     → checks 1 scan per year limit
     → generates presigned s3 url
     → writes scan record to dynamodb (status: UNREVEALED)
     → returns presigned url to frontend
     → frontend uploads image directly to s3
```

### submitting a guess
```
user → POST /scans/{scanId}/guess
     → submitGuess lambda
     → checks scan exists and is unrevealed
     → checks user hasn't already guessed on this scan
     → checks user isn't guessing on their own scan
     → writes guess to dynamodb (status: PENDING)
```

### revealing the gender
```
user → POST /scans/{scanId}/reveal
     → revealGender lambda
     → checks scan belongs to this user
     → updates scan in dynamodb (status: REVEALED, gender: boy/girl)
     → dynamodb stream fires
     → revealProcessor lambda wakes up
     → fetches all guesses for this scan
     → drops one sqs message per guess into the score queue
     → scoreGuess lambda picks up each message
     → scores each guess (CORRECT or WRONG)
     → updates guess in dynamodb
     → publishes to sns
     → sns fans out simultaneously to:
        → notifyUser queue → notifyUser lambda (emails the user their result)
        → leaderboard queue → leaderboard lambda (updates the leaderboard in rds)
```

### polling for a result
```
user → GET /scans/{scanId}/guess
     → getGuess lambda
     → returns current guess status (PENDING / CORRECT / WRONG)
