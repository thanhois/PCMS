package com.pcms.config.security;

import com.pcms.entity.AccountStatus;
import com.pcms.entity.UserAccount;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/**
 * Adapter UserAccount -> Spring Security UserDetails.
 * Authority có dạng {@code ROLE_<roleName>} để dùng được {@code hasRole("ADMIN")}.
 */
@Getter
public class UserPrincipal implements UserDetails {

    private final Integer id;
    private final String username;
    private final String email;
    private final String fullName;
    private final String password;
    private final String role;
    private final AccountStatus status;
    private final List<GrantedAuthority> authorities;

    public UserPrincipal(UserAccount user) {
        this.id = user.getUserId();
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.fullName = user.getFullName();
        this.password = user.getPasswordHash();
        this.role = user.getRole().getRoleName();
        this.status = user.getStatus();
        this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + this.role));
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public boolean isAccountNonLocked() {
        return status != AccountStatus.LOCKED;
    }

    @Override
    public boolean isEnabled() {
        return status == AccountStatus.ACTIVE;
    }
}
