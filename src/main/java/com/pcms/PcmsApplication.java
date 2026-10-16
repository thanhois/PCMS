package com.pcms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class PcmsApplication {

    public static void main(String[] args) {
        SpringApplication.run(PcmsApplication.class, args);
    }
}
