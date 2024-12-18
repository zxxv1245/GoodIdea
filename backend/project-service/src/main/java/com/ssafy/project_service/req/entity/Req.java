package com.ssafy.project_service.req.entity;


import com.ssafy.project_service.common.entity.BaseTime;
import com.ssafy.project_service.reqDocs.entity.ReqDocs;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Getter
public class Req extends BaseTime {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "req_id")
    private Long reqId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reqDocs_id", nullable = false)
    private ReqDocs reqDocs;

    @Column(length = 1000, nullable = false)
    private String url; // URL

    @Column(length = 1000, nullable = false)
    private String domain; // 도메인

    @Column(length = 1000)
    private String description; // 설명

    @Builder
    public Req(ReqDocs reqDocs, String url, String domain, String description) {
        this.reqDocs = reqDocs;
        this.url = url;
        this.domain = domain;
        this.description = description;
    }
}
