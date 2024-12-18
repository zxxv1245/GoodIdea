//package com.ssafy.project_service.common.config;
//
//import com.ssafy.project_service.client.GitLabApiClient;
//import com.ssafy.project_service.client.UserServiceClient;
//import com.ssafy.project_service.liveblocks.controller.LiveblocksFeignClient;
//import feign.Logger;
//import feign.Retryer;
//import org.springframework.cloud.openfeign.EnableFeignClients;
//import org.springframework.cloud.openfeign.FeignClientsConfiguration;
//import org.springframework.context.annotation.Bean;
//import org.springframework.context.annotation.Configuration;
//import org.springframework.context.annotation.Import;
//import com.ssafy.project_service.liveblocks.controller.LiveblocksFeignClient;
//
//@Configuration // 모든 FeignClient에 설정이 적용된다
//@EnableFeignClients(clients = {LiveblocksFeignClient.class, UserServiceClient.class, GitLabApiClient.class}) // client class를 직접 지정해야 config 커스텀 시 반영되나봐
//@Import(FeignClientsConfiguration.class)
//public class FeignConfig {
//
//    @Bean
//    Logger.Level feignLoggerLevel() {
//        return Logger.Level.FULL; // log 레벨 설정
//    }
//
//    @Bean
//    public Retryer retryer() {
//        return new Retryer.Default(1000, 2000, 3);
//    }
//
//}
