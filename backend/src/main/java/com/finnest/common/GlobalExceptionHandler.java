package com.finnest.common;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<String> handleMaxSizeException(MaxUploadSizeExceededException exc) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body("File is too large! Maximum allowed size is 1MB.");
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<String> handleDataIntegrityViolation(org.springframework.dao.DataIntegrityViolationException exc) {
        String msg = exc.getMostSpecificCause().getMessage();
        if (msg != null && msg.contains("violates foreign key constraint")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Cannot delete this record because it has linked transactions or documents.");
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body("Database integrity violation: " + (msg != null ? msg : exc.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleGeneralException(Exception exc) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Server Error: " + exc.getMessage());
    }
}
