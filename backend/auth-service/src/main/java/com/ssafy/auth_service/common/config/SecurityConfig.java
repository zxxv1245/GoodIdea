package com.ssafy.auth_service.common.config;

import com.ssafy.auth_service.auth.AuthTokensGenerator;
import com.ssafy.auth_service.auth.service.client.UserServiceClient;
import com.ssafy.auth_service.common.redis.RedisService;
import com.ssafy.auth_service.jwt.JwtAuthenticationFilter;
import com.ssafy.auth_service.jwt.JwtAuthorizationFilter;
import com.ssafy.auth_service.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.filter.CorsFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CorsFilter corsFilter;
    private final AuthenticationConfiguration authenticationConfiguration; // 인증 설정
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthTokensGenerator authTokensGenerator;
    private final RedisService redisService;
    private final UserServiceClient userServiceClient;

    // AuthenticationManager 빈 설정
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        AuthenticationManager authenticationManager = authenticationConfiguration.getAuthenticationManager();

        http.csrf(csrf -> csrf.disable());

        // 세션 사용 X
        http.sessionManagement(session -> {
            session.sessionCreationPolicy(SessionCreationPolicy.STATELESS);
        });

        // 서버는 CORS 정책에서 벗어날 수 있다.
        http.addFilterBefore(corsFilter, JwtAuthenticationFilter.class);
        http.addFilter(new JwtAuthenticationFilter(authenticationManager,jwtTokenProvider, authTokensGenerator,"/api/v1/login"));
        http.addFilter(new JwtAuthorizationFilter(authenticationManager, userServiceClient, jwtTokenProvider,redisService,authTokensGenerator));

        // form 로그인 사용하지 않는다
        http.formLogin(formLogin -> formLogin.disable());
        // HTTP Basic 인증 비활성화
        http.httpBasic(httpBasic -> httpBasic.disable());


        // URL 경로에 따른 접근 권한 설정
        http.authorizeRequests(request -> {
            request.requestMatchers("/api/v1/gitlab/**").permitAll();
            // 루트 경로는 모든 사용자 접근 가능
            request.requestMatchers("/").permitAll();

        });

        return http.build();
    }
}
