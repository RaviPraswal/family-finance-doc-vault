package com.finnest.common;

import org.springframework.core.MethodParameter;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.servlet.mvc.method.annotation.RequestBodyAdviceAdapter;

import java.lang.reflect.Type;

/**
 * Create requests (POST) never decide a record's identity or owner.
 * The top-level record's id, family and creator are cleared, so the database assigns the id and
 * TenantListener fills family and creator from the login. Nested link stubs ({"linkedAccount":{"id":…}})
 * keep their ids; they are checked by TenantGuard where they are resolved.
 */
@ControllerAdvice
public class CreateRequestSanitizer extends RequestBodyAdviceAdapter {

    @Override
    public boolean supports(MethodParameter parameter, Type targetType,
                            Class<? extends HttpMessageConverter<?>> converterType) {
        return parameter.hasMethodAnnotation(PostMapping.class)
                && TenantBaseEntity.class.isAssignableFrom(parameter.getParameterType());
    }

    @Override
    public Object afterBodyRead(Object body, HttpInputMessage inputMessage, MethodParameter parameter,
                                Type targetType, Class<? extends HttpMessageConverter<?>> converterType) {
        if (body instanceof TenantBaseEntity entity) {
            entity.setId(null);
            entity.setTenantId(null);
            entity.setUserId(null);
        }
        return body;
    }
}
