package com.finnest.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.NoSuchElementException;
import java.util.UUID;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<String> handleMaxSizeException(MaxUploadSizeExceededException exc) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body("File is too large. Maximum allowed size is 10MB.");
    }

    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    public ResponseEntity<String> handleAuthentication(org.springframework.security.core.AuthenticationException exc) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid email or password.");
    }

    @ExceptionHandler({NotFoundException.class, NoSuchElementException.class})
    public ResponseEntity<String> handleNotFound(RuntimeException exc) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Record not found.");
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<String> handleForbidden(ForbiddenException exc) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(exc.getMessage());
    }

    @ExceptionHandler(UnsupportedFileTypeException.class)
    public ResponseEntity<String> handleUnsupportedFile(UnsupportedFileTypeException exc) {
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(exc.getMessage());
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<String> handleDataIntegrityViolation(org.springframework.dao.DataIntegrityViolationException exc) {
        String msg = exc.getMostSpecificCause().getMessage();
        if (msg != null && msg.contains("violates foreign key constraint")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Cannot delete this record because it has linked transactions or documents.");
        }
        String ref = UUID.randomUUID().toString().substring(0, 8);
        log.warn("Data integrity violation [ref {}]", ref, exc);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("The data could not be saved (ref " + ref + ").");
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<String> handleRuntime(RuntimeException exc) {
        // Legacy controllers signal ownership failures with RuntimeException("Unauthorized").
        if ("Unauthorized".equals(exc.getMessage())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You do not have access to this record.");
        }
        return serverError(exc);
    }

    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<String> handleResponseStatus(org.springframework.web.server.ResponseStatusException exc) {
        return ResponseEntity.status(exc.getStatusCode()).body(exc.getReason());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleGeneralException(Exception exc) {
        return serverError(exc);
    }

    private ResponseEntity<String> serverError(Exception exc) {
        String ref = UUID.randomUUID().toString().substring(0, 8);
        log.error("Unhandled error [ref {}]", ref, exc);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Something went wrong. Please try again (ref " + ref + ").");
    }
}
