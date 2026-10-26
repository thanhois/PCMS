package com.pcms.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Chủ thú cưng (khách hàng).
 *
 * <p>{@code userId} là FK (nullable, unique) tới UserAccount: Pet Owner tự đăng ký online sẽ có
 * tài khoản; Pet Owner do Lễ tân tạo tại quầy (walk-in) có thể chưa có tài khoản.</p>
 */
@Entity
@Table(name = "PetOwner")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PetOwner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ownerId")
    private Integer ownerId;

    @Column(name = "fullName", nullable = false, length = 150)
    private String fullName;

    @Column(name = "phoneNumber", nullable = false, length = 20)
    private String phoneNumber;

    @Column(name = "email", length = 150)
    private String email;

    @Column(name = "address", length = 255)
    private String address;

    /**
     * Về nghiệp vụ là quan hệ 1-1, nhưng map bằng @ManyToOne vì Hibernate 6 tự sinh UNIQUE cho FK của
     * @OneToOne, mà SQL Server UNIQUE chỉ cho phép 1 giá trị NULL (sẽ lỗi khi có nhiều Pet Owner walk-in
     * chưa có tài khoản). Ràng buộc 1-1 được đảm bảo ở tầng service.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userId")
    private UserAccount userAccount;

    @Builder.Default
    @Column(name = "status", length = 20)
    private String status = "ACTIVE";
}
